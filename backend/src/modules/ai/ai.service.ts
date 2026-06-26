import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Trip } from '@/modules/trip/entities/trip.entity';
import { Category } from '@/modules/place/entities/category.entity';
import { Province } from '@/modules/place/entities/province.entity';
import { AiChatSession } from './entities/ai-chat-session.entity';
import { AiChatMessage, AiRole } from './entities/ai-chat-message.entity';
import { LLM_PROVIDER, type LlmProvider } from './llm/llm-provider.interface';
import { GeminiProvider } from './llm/gemini.provider';
import { TripsService } from '@/modules/trip/trips.service';
import { Place } from '@/modules/place/entities/place.entity';
import { UserPreference } from '@/modules/user/entities/user-preference.entity';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/** Draft the bot can offer; FE turns it into a real Trip on user confirmation. */
export interface AiTripSuggestion {
  title: string;
  destination: string;
  durationDays: number;
  startDate?: string;
  endDate?: string;
  summary: string;
  categoryKey?: string;
  tags?: string[];
  /** Optional cover image URL (Unsplash, Pexels) — bot may suggest one. */
  coverImage?: string;
  itinerary?: {
    dayNumber: number;
    title: string;
    activities?: { time: string; title: string; description?: string }[];
  }[];
  estimatedBudget?: number;
  maxMembers?: number;
  /** Lưu trú / di chuyển / bữa ăn — gói kèm chuyến. */
  inclusions?: { accommodation?: string; transport?: string; meals?: string };
}

export type AiIntent =
  | 'inform'
  | 'ask_suggest'
  | 'suggest'
  | 'create'
  | 'general'
  | 'edit_place'
  | 'finalize';

export interface AskResult {
  answer: string;
  intent: AiIntent;
  trips: Trip[];
  suggestion?: AiTripSuggestion;
}

/** Task được LLM bóc ra ở bước HIỂU. */
interface ParsedTask {
  intent: AiIntent;
  /** Từ khoá/điểm đến để tìm chuyến trong DB. */
  destination?: string;
  days?: number;
  budget?: number;
  /** Sở thích/ghi chú để viết lộ trình. */
  prefs?: string;
}

/**
 * Trợ lý du lịch theo pipeline 3 bước, KHÔNG khoá cứng vào Gemini:
 *   1. HIỂU    — LLM đọc câu user → ParsedTask (intent + tham số).
 *   2. LÀM VIỆC — code thuần + DB tìm chuyến/địa điểm thật khớp task.
 *   3. TRẢ VỀ  — LLM viết câu trả lời / lộ trình tiếng Việt từ dữ liệu thật.
 *
 * LLM provider được inject (local self-host / gemini / template) qua LLM_PROVIDER.
 * Mọi bước đều có fallback để chatbot không chết khi LLM lỗi.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @InjectRepository(Trip) private readonly trips: Repository<Trip>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Province) private readonly provinces: Repository<Province>,
    @InjectRepository(Place) private readonly places: Repository<Place>,
    @InjectRepository(AiChatSession) private readonly sessions: Repository<AiChatSession>,
    @InjectRepository(AiChatMessage) private readonly messages: Repository<AiChatMessage>,
    @InjectRepository(UserPreference)
    private readonly userPrefs: Repository<UserPreference>,
    private readonly config: ConfigService,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
    private readonly gemini: GeminiProvider,
    private readonly tripsService: TripsService,
  ) {}

  async ask(
    userId: string | undefined,
    query: string,
    history: ChatTurn[] = [],
    draft?: AiTripSuggestion | null,
  ): Promise<AskResult> {
    let result: AskResult;
    try {
      result = await this.runPipeline(query, history, userId, draft ?? null);
    } catch (err) {
      this.logger.warn(`Pipeline LLM lỗi, dùng fallback: ${(err as Error).message}`);
      const trips = await this.matchTrips(query);
      result = this.fallback(query, trips);
    }

    if (userId) {
      const session = await this.upsertSession(userId);
      await this.messages.save(
        this.messages.create({ sessionId: session.id, role: AiRole.USER, content: query }),
      );
      await this.messages.save(
        this.messages.create({
          sessionId: session.id,
          role: AiRole.ASSISTANT,
          content: result.answer,
          tripIds: result.trips.map((t) => t.id),
        }),
      );
    }

    return result;
  }

  /* ───────────────── Pipeline 3 bước ───────────────── */

  private async runPipeline(
    query: string,
    history: ChatTurn[],
    userId?: string,
    draft?: AiTripSuggestion | null,
  ): Promise<AskResult> {
    // Provider template (hoặc LLM chưa sẵn sàng) → đi luồng fallback DB ngay.
    if (!this.llm.isReady() || this.llm.name === 'template') {
      const trips = await this.matchTrips(query);
      return this.fallback(query, trips);
    }

    // Có lộ trình đang dựng dở → ưu tiên xử lý chỉnh sửa / chốt thông tin.
    if (draft && draft.title) {
      const action = this.classifyDraftAction(query);
      if (action === 'edit_place') {
        return this.handleEditPlace(query, history, draft);
      }
      if (action === 'finalize') {
        return this.handleFinalize(query, draft, userId);
      }
      // action === 'other' → rơi xuống pipeline thường (user hỏi việc khác).
    }

    // BƯỚC 1 — HIỂU: LLM bóc task.
    const task = await this.understand(query, history);

    // BƯỚC 2 — LÀM VIỆC: tìm chuyến thật theo task (DB, không LLM).
    // Model nhỏ đôi khi rớt dấu tiếng Việt ("Đà Nẵng"→"Nẵng"). Thử keyword model
    // trước; nếu trượt, thử lại bằng query gốc để không bỏ sót chuyến thật.
    const keyword = task.destination?.trim() || query;
    let trips = await this.matchTrips(keyword);
    if (trips.length === 0 && keyword !== query) {
      trips = await this.matchTrips(query);
    }

    // RAG: tra kho kiến thức tỉnh thành để LLM có dữ liệu thật mà viết.
    const province = await this.matchProvince(keyword, query);

    // BƯỚC 3 — TRẢ VỀ: viết câu trả lời / lộ trình.
    return this.respond(query, history, task, trips, province, userId);
  }

  /**
   * Khi đã có lộ trình nháp, phân loại nhanh ý định bằng luật (không cần LLM):
   *  - 'edit_place': muốn thay/đổi/bỏ một địa điểm trong lịch trình.
   *  - 'finalize'  : cung cấp ngày/số người/chi phí để chốt chuyến.
   *  - 'other'     : việc khác → quay lại pipeline thường.
   */
  private classifyDraftAction(query: string): 'edit_place' | 'finalize' | 'other' {
    const q = query.toLowerCase();
    // Tín hiệu CHỐT (ưu tiên cao): ngày lịch dd/mm, "ngày N tháng M", số người,
    // chi phí. Phải xét TRƯỚC edit_place để "đổi ngày thành 29/7" không bị hiểu
    // nhầm là đổi địa điểm (vốn vì chữ "ngày" lẫn trong nhóm danh từ địa điểm).
    const hasDate =
      /\d{1,2}\s*[/\-.]\s*\d{1,2}|ngày\s+\d{1,2}\s+tháng|tháng\s+\d{1,2}|khởi hành|xuất phát|kết thúc/.test(
        q,
      );
    const hasMembers = /\d+\s*(người|thành viên|bạn|nguoi)|tối đa/.test(q);
    const hasCost = /\d+\s*(k|nghìn|ngàn|triệu|tr|đồng|vnd|đ)|chi phí|giá|ngân sách/.test(q);
    if (hasDate || hasMembers || hasCost) return 'finalize';

    // Tín hiệu chỉnh sửa địa điểm (khi KHÔNG có tín hiệu chốt ở trên). Bỏ "ngày"
    // khỏi nhóm danh từ địa điểm — nó nhập nhằng với "đổi ngày" (đổi lịch khởi
    // hành). Câu sửa lịch trình theo ngày vẫn khớp qua danh từ thật (thác, biển…).
    if (
      /(thay|đổi|bỏ|xoá|xóa|thêm|thay thế|đổi lại|không thích|chán)/.test(q) &&
      /(địa điểm|chỗ|nơi|điểm|hoạt động|thác|biển|chùa|núi|đảo|ăn|quán)/.test(q)
    ) {
      return 'edit_place';
    }
    return 'other';
  }

  /* ───────────────── Chỉnh sửa địa điểm trong lộ trình ───────────────── */

  /**
   * User muốn thay 1 địa điểm. Bóc {oldPlace, newPlace} từ câu, tra newPlace
   * trong data (Place + Province.highlights). Nếu KHÔNG có → gọi Gemini gợi ý
   * mô tả/hoạt động cho địa điểm đó. Sau đó nhờ LLM viết lại lộ trình.
   */
  private async handleEditPlace(
    query: string,
    history: ChatTurn[],
    draft: AiTripSuggestion,
  ): Promise<AskResult> {
    const edit = await this.extractPlaceEdit(query, draft);
    const newPlace = edit?.newPlace?.trim();

    let placeInfo = '';
    let viaGemini = false;
    if (newPlace) {
      const found = await this.findPlaceInfo(newPlace, draft.destination);
      if (found) {
        placeInfo = `Thông tin THẬT về "${newPlace}": ${found}`;
      } else {
        // Không có trong data → gọi Gemini gợi ý (theo yêu cầu).
        const g = await this.geminiPlaceInfo(newPlace, draft.destination).catch(() => null);
        if (g) {
          placeInfo = `Gợi ý về "${newPlace}" (nguồn AI): ${g}`;
          viaGemini = true;
        }
      }
    }

    const updated = await this.rewriteItinerary(draft, query, placeInfo).catch(() => null);
    if (!updated) {
      return {
        intent: 'edit_place',
        answer: 'Mình chưa chỉnh được lộ trình. Bạn nói rõ muốn thay địa điểm nào bằng địa điểm nào nhé?',
        trips: [],
        suggestion: draft,
      };
    }
    const note = viaGemini
      ? ` (mình tham khảo thêm gợi ý AI cho "${newPlace}" vì chưa có trong dữ liệu)`
      : '';
    return {
      intent: 'edit_place',
      answer: `Mình đã cập nhật lộ trình theo yêu cầu${note}. Bạn xem lại nhé!`,
      trips: [],
      suggestion: updated,
    };
  }

  /** Bóc {oldPlace, newPlace} từ câu bằng LLM. */
  private async extractPlaceEdit(
    query: string,
    draft: AiTripSuggestion,
  ): Promise<{ oldPlace?: string; newPlace?: string } | null> {
    const system = `Bạn phân tích yêu cầu chỉnh sửa lộ trình. TRẢ VỀ JSON:
{"oldPlace": "địa điểm muốn bỏ/thay (để trống nếu chỉ thêm)", "newPlace": "địa điểm muốn thêm/thay vào"}
Chỉ trả JSON.`;
    const prompt = `Lộ trình hiện tại: "${draft.title}" tại ${draft.destination}.
Yêu cầu của user: ${query}`;
    return this.llm.generateJson<{ oldPlace?: string; newPlace?: string }>({
      system,
      prompt,
      temperature: 0.2,
      maxTokens: 128,
    });
  }

  /** Tra 1 địa điểm trong Place + Province.highlights. Trả mô tả ngắn hoặc null. */
  private async findPlaceInfo(name: string, destination: string): Promise<string | null> {
    const place = await this.places
      .createQueryBuilder('p')
      .where('p.name ILIKE :n', { n: `%${name}%` })
      .getOne();
    if (place) {
      return `${place.name} — ${place.description?.slice(0, 200) ?? ''}`;
    }
    // Tìm trong highlights của tỉnh.
    const prov = await this.provinces
      .createQueryBuilder('p')
      .where('p.name ILIKE :d', { d: `%${destination}%` })
      .getOne();
    if (prov?.highlights?.some((h) => h.toLowerCase().includes(name.toLowerCase()))) {
      return `${name} là điểm nổi bật của ${prov.name}.`;
    }
    return null;
  }

  /** Gọi Gemini gợi ý mô tả + hoạt động cho địa điểm không có trong data. */
  private async geminiPlaceInfo(name: string, destination: string): Promise<string | null> {
    if (!this.gemini.isReady()) return null;
    const text = await this.gemini.complete({
      system:
        'Bạn là chuyên gia du lịch Việt Nam. Mô tả ngắn gọn (2-3 câu) một địa điểm và 1-2 hoạt động nên làm ở đó. Chỉ trả văn bản.',
      prompt: `Địa điểm: "${name}" ở khu vực ${destination}. Mô tả ngắn và gợi ý hoạt động.`,
      temperature: 0.6,
      maxTokens: 256,
    });
    return text?.trim() || null;
  }

  /** Nhờ LLM viết lại lộ trình theo yêu cầu chỉnh sửa + thông tin địa điểm mới. */
  private async rewriteItinerary(
    draft: AiTripSuggestion,
    query: string,
    placeInfo: string,
  ): Promise<AiTripSuggestion | null> {
    const system = `Bạn chỉnh sửa lộ trình du lịch. Giữ nguyên cấu trúc, chỉ áp dụng
thay đổi user yêu cầu. TRẢ VỀ DUY NHẤT JSON đúng schema cũ:
{"title","destination","durationDays","summary","itinerary":[{"dayNumber","title","activities":[{"time","title","description"}]}],"tags","categoryKey","estimatedBudget","maxMembers"}
Không markdown. Giữ tiếng Việt.`;
    const prompt = `Lộ trình hiện tại (JSON):
${JSON.stringify({
      title: draft.title,
      destination: draft.destination,
      durationDays: draft.durationDays,
      summary: draft.summary,
      itinerary: draft.itinerary,
      tags: draft.tags,
      categoryKey: draft.categoryKey,
      estimatedBudget: draft.estimatedBudget,
      maxMembers: draft.maxMembers,
    })}

Yêu cầu chỉnh sửa: ${query}
${placeInfo ? `\n${placeInfo}` : ''}`;
    const updated = await this.llm.generateJson<AiTripSuggestion>({
      system,
      prompt,
      temperature: 0.4,
      maxTokens: 2048,
    });
    if (!updated || !updated.title) return null;
    return updated;
  }

  /* ───────────────── Chốt thông tin chuyến (finalize) ───────────────── */

  /**
   * Bóc ngày khởi hành/kết thúc, số người, chi phí từ câu. Mặc định năm 2026
   * khi user chỉ nói ngày/tháng. Kiểm tra trùng lịch. Gợi ý chi phí nếu thiếu.
   */
  private async handleFinalize(
    query: string,
    draft: AiTripSuggestion,
    userId?: string,
  ): Promise<AskResult> {
    const slots = extractFinalizeSlots(query);
    const next: AiTripSuggestion = { ...draft };

    if (slots.startDate) next.startDate = slots.startDate;
    if (slots.endDate) next.endDate = slots.endDate;
    if (slots.maxMembers) next.maxMembers = slots.maxMembers;
    if (slots.pricePerPerson != null) next.estimatedBudget = slots.pricePerPerson;
    // Lưu trú / di chuyển / bữa ăn (gộp vào, giữ giá trị cũ nếu lần này không nêu).
    if (slots.accommodation || slots.transport || slots.meals) {
      next.inclusions = {
        accommodation: slots.accommodation ?? next.inclusions?.accommodation,
        transport: slots.transport ?? next.inclusions?.transport,
        meals: slots.meals ?? next.inclusions?.meals,
      };
    }

    // Suy endDate từ startDate + durationDays nếu user chỉ cho ngày đi.
    if (next.startDate && !next.endDate && next.durationDays) {
      next.endDate = addDaysIso(next.startDate, next.durationDays - 1);
    }
    // Suy số ngày nếu có cả 2 mốc.
    if (next.startDate && next.endDate) {
      const d = daysBetween(next.startDate, next.endDate);
      if (d > 0) next.durationDays = d;
    }

    const missing: string[] = [];
    if (!next.startDate) missing.push('ngày khởi hành');
    if (!next.endDate) missing.push('ngày kết thúc');
    if (!next.maxMembers) missing.push('số người tối đa');
    if (next.estimatedBudget == null) missing.push('chi phí mỗi người');

    // Lưu trú / di chuyển / bữa ăn — tuỳ chọn, hỏi nhưng KHÔNG chặn tạo chuyến.
    const inc = next.inclusions ?? {};
    const optMissing: string[] = [];
    if (!inc.accommodation) optMissing.push('lưu trú');
    if (!inc.transport) optMissing.push('di chuyển');
    if (!inc.meals) optMissing.push('bữa ăn');

    // Kiểm tra trùng lịch (chỉ khi đã đăng nhập + có đủ 2 mốc ngày).
    let conflictMsg = '';
    if (userId && next.startDate && next.endDate) {
      const conflict = await this.tripsService
        .findDateConflict(userId, next.startDate, next.endDate)
        .catch(() => null);
      if (conflict) {
        const from = new Date(conflict.startDate).toLocaleDateString('vi-VN');
        const to = new Date(conflict.endDate).toLocaleDateString('vi-VN');
        conflictMsg = `\n\n⚠️ Lưu ý: bạn đã có chuyến "${conflict.title}" (${from} – ${to}) trùng khoảng ngày này. Cân nhắc đổi ngày nhé.`;
      }
    }

    // Gợi ý chi phí nếu user chưa nêu.
    const budgetHint =
      next.estimatedBudget == null
        ? ` Gợi ý chi phí khoảng ${suggestBudget(next).toLocaleString('vi-VN')}đ/người cho ${next.durationDays ?? 3} ngày.`
        : '';

    let answer: string;
    const optHint = optMissing.length
      ? `\nBạn có muốn bổ sung ${optMissing.join(', ')} không? (tuỳ chọn)`
      : '';
    if (missing.length === 0) {
      const fromVn = next.startDate ? new Date(next.startDate).toLocaleDateString('vi-VN') : '';
      const toVn = next.endDate ? new Date(next.endDate).toLocaleDateString('vi-VN') : '';
      answer =
        `Đã chốt: khởi hành ${fromVn}, kết thúc ${toVn}, tối đa ${next.maxMembers} người, ` +
        `chi phí ~${Number(next.estimatedBudget).toLocaleString('vi-VN')}đ/người. ` +
        `Bạn bấm "Tạo chuyến" để hoàn tất nhé!${optHint}${conflictMsg}`;
    } else {
      answer =
        `Mình cập nhật rồi. Còn thiếu: ${missing.join(', ')}. Bạn cho mình biết thêm nhé.` +
        budgetHint +
        optHint +
        conflictMsg;
    }

    return { intent: 'finalize', answer, trips: [], suggestion: next };
  }

  /**
   * Tra tỉnh trong kho kiến thức theo tên/keyword. Khớp không dấu tương đối để
   * model nhỏ rớt dấu vẫn tìm được (so trên name + slug).
   */
  private async matchProvince(keyword: string, query: string): Promise<Province | null> {
    const candidates = [keyword, query].map((s) => s.trim()).filter(Boolean);
    for (const c of candidates) {
      // Thử khớp name chứa keyword hoặc keyword chứa name.
      const byName = await this.provinces
        .createQueryBuilder('p')
        .where('p.name ILIKE :kw', { kw: `%${c}%` })
        .orWhere(':kw ILIKE CONCAT(\'%\', p.name, \'%\')', { kw: c })
        .getOne();
      if (byName) return byName;
    }
    // Fallback: tách token, khớp từng token với tên tỉnh (vd "Nẵng"→"Đà Nẵng").
    const tokens = query.split(/\s+/).filter((w) => w.length >= 3);
    for (const tok of tokens) {
      const p = await this.provinces
        .createQueryBuilder('p')
        .where('p.name ILIKE :kw', { kw: `%${tok}%` })
        .getOne();
      if (p) return p;
    }
    return null;
  }

  /** BƯỚC 1 — LLM phân tích câu user thành task có cấu trúc. */
  private async understand(query: string, history: ChatTurn[]): Promise<ParsedTask> {
    const system = `Bạn là bộ phân tích yêu cầu cho trợ lý du lịch TripMate (tiếng Việt).
Đọc câu mới nhất của người dùng (kèm ngữ cảnh hội thoại) và TRẢ VỀ DUY NHẤT một JSON:
{
  "intent": "inform" | "ask_suggest" | "suggest" | "general",
  "destination": "tên tỉnh/thành/địa danh nếu có, để trống nếu không",
  "days": số ngày nếu user nêu (số nguyên) hoặc bỏ qua,
  "budget": ngân sách VND nếu user nêu (số) hoặc bỏ qua,
  "prefs": "sở thích/yêu cầu đặc biệt nếu có (biển, ẩm thực, gia đình...)"
}
Quy tắc chọn intent:
- "inform": user hỏi/ tìm chuyến đi tới một nơi cụ thể.
- "suggest": user nhờ gợi ý / lập lộ trình mới, HOẶC đồng ý ("có","ok","gợi ý đi","muốn").
- "ask_suggest": user mơ hồ, chưa rõ muốn gì.
- "general": chào hỏi / mẹo chung / không liên quan địa điểm.
Chỉ trả JSON, không markdown, không giải thích.`;

    const parsed = await this.llm.generateJson<ParsedTask>({
      system,
      history,
      prompt: query,
      temperature: 0.2,
      maxTokens: 256,
    });

    if (!parsed || !parsed.intent) {
      // LLM hỏng → đoán intent thô theo từ khoá.
      return { intent: this.guessIntent(query), destination: query };
    }
    return parsed;
  }

  /** BƯỚC 3 — LLM viết câu trả lời / lộ trình từ dữ liệu thật. */
  private async respond(
    query: string,
    history: ChatTurn[],
    task: ParsedTask,
    trips: Trip[],
    province: Province | null,
    userId?: string,
  ): Promise<AskResult> {
    // Nếu user chỉ tìm chuyến và DB có sẵn → giới thiệu, không cần sinh lộ trình.
    if (task.intent === 'inform' && trips.length > 0) {
      const answer = await this.writeInform(query, history, trips, province).catch(() => null);
      return {
        intent: 'inform',
        answer: answer || this.fallback(query, trips).answer,
        trips: trips.slice(0, 4),
      };
    }

    // User nhờ gợi ý / lập lộ trình → LLM sinh suggestion JSON.
    if (task.intent === 'suggest') {
      const suggestion = await this.writeSuggestion(query, history, task, trips, province, userId).catch(
        () => null,
      );
      if (suggestion) {
        // Gợi ý chi phí sẵn nếu LLM chưa điền, để câu hỏi chốt có số liệu.
        if (suggestion.estimatedBudget == null) {
          suggestion.estimatedBudget = suggestBudget(suggestion);
        }
        const budgetVnd = Number(suggestion.estimatedBudget).toLocaleString('vi-VN');
        // CHỦ ĐỘNG hỏi thông tin để chốt chuyến (theo yêu cầu nghiệp vụ).
        const ask =
          `Mình gợi ý lộ trình "${suggestion.title}" cho ${suggestion.destination} ` +
          `(${suggestion.durationDays} ngày). Để mình chốt chuyến, bạn cho mình biết:\n` +
          `• Ngày khởi hành & ngày kết thúc (vd: 20/12 - 23/12)\n` +
          `• Số người tối đa\n` +
          `• Chi phí mỗi người (mình gợi ý ~${budgetVnd}đ/người)\n` +
          `• Lưu trú, di chuyển, bữa ăn (tuỳ chọn)\n` +
          `Bạn cũng có thể yêu cầu mình thay địa điểm nào chưa ưng nhé.`;
        return {
          intent: 'suggest',
          answer: ask,
          trips: [],
          suggestion,
        };
      }
      // Sinh lỗi → hạ xuống ask_suggest.
      return {
        intent: 'ask_suggest',
        answer:
          'Mình chưa dựng được lộ trình lúc này. Bạn cho mình thêm điểm đến và số ngày nhé?',
        trips: [],
      };
    }

    // inform nhưng không có chuyến khớp → mời gợi ý.
    if (task.intent === 'inform' && trips.length === 0) {
      return {
        intent: 'ask_suggest',
        answer: `Mình chưa thấy chuyến nào tới ${task.destination || 'nơi bạn nói'}. Bạn muốn mình gợi ý một lộ trình mới không?`,
        trips: [],
      };
    }

    // general / ask_suggest → trả lời ngắn bằng LLM (có fallback).
    const answer = await this.writeGeneral(query, history).catch(() => null);
    return {
      intent: task.intent === 'general' ? 'general' : 'ask_suggest',
      answer:
        answer ||
        'Mình là trợ lý du lịch TripMate. Bạn muốn đi đâu hoặc cần mình gợi ý lộ trình nào không?',
      trips: trips.slice(0, 4),
    };
  }

  // PLACEHOLDER_WRITERS

  /** Search trips by keyword/category/destination (PG ILIKE). */
  private async matchTrips(query: string): Promise<Trip[]> {
    const q = query.trim();
    if (!q) return [];
    // Tách token, bỏ stopword du lịch để cụm địa danh nổi lên (vd "tìm chuyến
    // đi Đà Nẵng" → ["Đà","Nẵng"]). Bỏ thêm từ chỉ thời lượng/số người và token
    // thuần số để chúng không lẫn vào điều kiện khớp destination.
    const STOP = new Set([
      'tìm', 'chuyến', 'đi', 'du', 'lịch', 'muốn', 'có', 'nào', 'không',
      'tôi', 'mình', 'cho', 'đến', 'ở', 'tại', 'một', 'các', 'và', 'the', 'trip',
      'ngày', 'ngay', 'đêm', 'dem', 'tuần', 'tuan', 'người', 'nguoi', 'bạn',
    ]);
    const tokens = q
      .split(/\s+/)
      .filter(
        (w) => w.length >= 2 && !STOP.has(w.toLowerCase()) && !/^\d+$/.test(w),
      );

    const qb = this.trips
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.category', 'cat')
      .leftJoinAndSelect('t.creator', 'creator')
      .where(
        new Brackets((b) => {
          // Khớp NGUYÊN cụm trên các cột chính.
          b.where('t.title ILIKE :kw', { kw: `%${q}%` })
            .orWhere('t.destination ILIKE :kw', { kw: `%${q}%` })
            .orWhere('t.description ILIKE :kw', { kw: `%${q}%` })
            .orWhere(':q = ANY(t.tags)', { q });
          // Khớp theo token nhưng PHẢI đủ TẤT CẢ token trên destination. Nhờ
          // vậy "Hà Nội" (Hà AND Nội) không còn lọt "Hà Giang" — vốn chỉ chung
          // mỗi tiếng "Hà". Một token đơn chung tiền tố không tự kéo tỉnh khác vào.
          if (tokens.length) {
            b.orWhere(
              new Brackets((tb) => {
                tokens.forEach((tok, i) => {
                  tb.andWhere(`t.destination ILIKE :tok${i}`, {
                    [`tok${i}`]: `%${tok}%`,
                  });
                });
              }),
            );
          }
        }),
      );

    // Lấy dư (rating cao trước) rồi XẾP HẠNG trong JS: khớp đúng cụm ở
    // destination lên đầu, rồi tới title, rồi rating. Làm ở JS để tránh đặt
    // tham số trong orderBy — TypeORM hiểu nhầm biểu thức CASE là alias khi
    // kết hợp với take()+join (gây lỗi "(CASE WHEN t" alias not found).
    const rows = await qb.orderBy('t.rating', 'DESC').take(20).getMany();
    const lc = q.toLowerCase();
    const rank = (t: Trip) =>
      (t.destination ?? '').toLowerCase().includes(lc)
        ? 2
        : (t.title ?? '').toLowerCase().includes(lc)
          ? 1
          : 0;
    return rows
      .sort((a, b) => rank(b) - rank(a) || Number(b.rating) - Number(a.rating))
      .slice(0, 5);
  }

  private fallback(query: string, trips: Trip[]): AskResult {
    if (trips.length === 0) {
      return {
        intent: 'ask_suggest',
        answer:
          'Mình chưa thấy chuyến đi nào khớp. Bạn muốn mình gợi ý một lộ trình mới cho điểm đến này không?',
        trips: [],
      };
    }
    const top = trips[0];
    const more = trips.length > 1 ? ` cùng ${trips.length - 1} gợi ý khác` : '';
    return {
      intent: 'inform',
      answer: `Dựa trên "${query.trim()}", mình tìm được "${top.title}" tại ${top.destination}${more}. Bạn xem các thẻ bên dưới nhé.`,
      trips,
    };
  }

  private async upsertSession(userId: string): Promise<AiChatSession> {
    const existing = await this.sessions.findOne({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
    if (existing) return existing;
    return this.sessions.save(this.sessions.create({ userId }));
  }

  /* ───────────────── Writers (bước TRẢ VỀ) ───────────────── */

  /** Định dạng kho kiến thức tỉnh thành kèm prompt cho LLM (RAG context). */
  private provinceContext(p: Province | null): string {
    if (!p) return '';
    const parts = [
      `THÔNG TIN THẬT về ${p.name}${p.region ? ` (miền ${p.region === 'north' ? 'Bắc' : p.region === 'central' ? 'Trung' : 'Nam'})` : ''}:`,
      p.knownFor ? `- Nổi tiếng: ${p.knownFor}` : '',
      p.summary ? `- Giới thiệu: ${p.summary}` : '',
      p.bestSeason ? `- Mùa đẹp: ${p.bestSeason}` : '',
      p.specialties?.length ? `- Đặc sản: ${p.specialties.join(', ')}` : '',
      p.highlights?.length ? `- Điểm đến nổi bật: ${p.highlights.join(', ')}` : '',
    ].filter(Boolean);
    return parts.join('\n');
  }

  /** Đoán intent thô khi LLM không sẵn sàng. */
  private guessIntent(query: string): AiIntent {
    const q = query.toLowerCase();
    if (/(gợi ý|đề xuất|lộ trình|lên kế hoạch|có|ok|được|muốn)/.test(q)) return 'suggest';
    if (/(chào|hi|hello|thời tiết|mẹo|cảm ơn)/.test(q)) return 'general';
    return 'inform';
  }

  /** Viết 1-2 câu giới thiệu các chuyến tìm được. */
  private async writeInform(
    query: string,
    history: ChatTurn[],
    trips: Trip[],
    province: Province | null,
  ): Promise<string> {
    const list = trips
      .slice(0, 4)
      .map(
        (t) =>
          `- "${t.title}" tại ${t.destination}, ${t.durationDays} ngày, từ ${Number(t.priceFrom).toLocaleString('vi-VN')} ${t.currency}`,
      )
      .join('\n');
    const pCtx = this.provinceContext(province);
    const system = `Bạn là trợ lý du lịch TripMate, nói tiếng Việt thân thiện, xưng "mình".
Dưới đây là các chuyến đi CÓ THẬT trong hệ thống khớp yêu cầu. Viết 1-2 câu giới
thiệu ngắn gọn (có thể nhắc 1 nét đặc trưng của điểm đến nếu có), rồi mời người
dùng xem các thẻ bên dưới. KHÔNG bịa thông tin ngoài dữ liệu cho sẵn. Chỉ trả về
văn bản, không markdown.`;
    return this.llm.complete({
      system,
      history,
      prompt: `Yêu cầu: ${query}\n${pCtx ? `\n${pCtx}\n` : ''}\nCác chuyến phù hợp:\n${list}`,
      temperature: 0.5,
      maxTokens: 256,
    });
  }

  /** Trả lời câu chung / mơ hồ. */
  private async writeGeneral(query: string, history: ChatTurn[]): Promise<string> {
    const system = `Bạn là trợ lý du lịch TripMate, nói tiếng Việt thân thiện, xưng "mình".
Trả lời ngắn gọn (1-3 câu). Nếu user chưa rõ muốn gì, gợi mở hỏi điểm đến hoặc
đề nghị lập lộ trình. Chỉ trả về văn bản, không markdown.`;
    return this.llm.complete({
      system,
      history,
      prompt: query,
      temperature: 0.6,
      maxTokens: 256,
    });
  }

  /** Viết lộ trình gợi ý (suggestion JSON) từ task + bối cảnh chuyến thật. */
  private async writeSuggestion(
    query: string,
    history: ChatTurn[],
    task: ParsedTask,
    trips: Trip[],
    province: Province | null,
    userId?: string,
  ): Promise<AiTripSuggestion | null> {
    const today = new Date().toISOString().slice(0, 10);
    // Bối cảnh từ chuyến thật (nếu có) để model bám dữ liệu sẵn có.
    const context =
      trips.length > 0
        ? trips
            .slice(0, 3)
            .map((t) => `- "${t.title}" (${t.destination}, ${t.durationDays} ngày)`)
            .join('\n')
        : 'Không có chuyến mẫu trong DB — tự dựng lộ trình hợp lý.';
    const pCtx = this.provinceContext(province);
    // Hồ sơ sở thích cá nhân (bảng user_preferences) → cá nhân hoá lộ trình.
    const prefCtx = await this.personalizationContext(userId);

    const system = `Bạn là chuyên gia lập lộ trình du lịch Việt Nam cho TripMate.
TRẢ VỀ DUY NHẤT một JSON đúng schema (không markdown, không \`\`\`):
{
  "title": "tên lộ trình hấp dẫn",
  "destination": "tên tỉnh/thành",
  "durationDays": số ngày (1-14),
  "summary": "3-5 câu giới thiệu",
  "itinerary": [{ "dayNumber": 1, "title": "...", "activities": [{ "time": "08:00", "title": "...", "description": "..." }] }],
  "tags": ["3-6 từ khoá"],
  "categoryKey": "một trong: beach, mountain, food, culture, city, island, adventure",
  "estimatedBudget": số VND ước tính/người,
  "maxMembers": số (4-12)
}
Ngày hôm nay: ${today}. Viết tiếng Việt. Lộ trình thực tế, mỗi ngày 2-4 hoạt động.
Ưu tiên bám theo "SỞ THÍCH CÁ NHÂN" (nếu có) để chọn loại hình & hoạt động hợp gu.
QUAN TRỌNG: CHỈ dùng các điểm đến và đặc sản có trong "THÔNG TIN THẬT" cho sẵn bên
dưới. TUYỆT ĐỐI KHÔNG bịa tên thác, đảo, địa danh không có trong danh sách đó.`;

    const prompt = `Yêu cầu của người dùng: ${query}
Điểm đến: ${task.destination ?? '(tự chọn hợp lý)'}
Số ngày: ${task.days ?? '(tự đề xuất)'}
Ngân sách: ${task.budget ? task.budget.toLocaleString('vi-VN') + ' VND' : '(không nêu)'}
Sở thích: ${task.prefs ?? '(không nêu)'}
${prefCtx ? `${prefCtx}\n` : ''}${pCtx ? `\n${pCtx}\n` : ''}
Chuyến tham khảo trong hệ thống:
${context}`;

    const suggestion = await this.llm.generateJson<AiTripSuggestion>({
      system,
      history,
      prompt,
      temperature: 0.4,
      maxTokens: 2048,
    });
    if (!suggestion || !suggestion.title || !suggestion.destination) return null;
    // Chuẩn hoá vài field tối thiểu.
    if (!suggestion.durationDays || suggestion.durationDays < 1) {
      suggestion.durationDays = task.days ?? suggestion.itinerary?.length ?? 3;
    }
    return suggestion;
  }

  /**
   * Build a short "SỞ THÍCH CÁ NHÂN" block from the user's structured
   * preference profile (user_preferences table). Returns '' for guests or when
   * the user has not set any — so the prompt stays clean.
   */
  private async personalizationContext(userId?: string): Promise<string> {
    if (!userId) return '';
    const p = await this.userPrefs.findOne({ where: { userId } }).catch(() => null);
    if (!p) return '';
    const parts: string[] = [];
    if (p.categories?.length) parts.push(`Loại hình thích: ${p.categories.join(', ')}`);
    if (p.interests?.length) parts.push(`Quan tâm: ${p.interests.join(', ')}`);
    if (p.provinces?.length) parts.push(`Hay đi: ${p.provinces.join(', ')}`);
    if (p.budgetTier) parts.push(`Mức chi tiêu: ${p.budgetTier}`);
    if (parts.length === 0) return '';
    return `SỞ THÍCH CÁ NHÂN (ưu tiên bám theo):\n- ${parts.join('\n- ')}`;
  }

  /* ───────────────────────── Materialize a draft ───────────────────────── */

  /**
   * Look up a Category by key with safe fallback so trip creation never fails
   * when the bot picks an unknown key. Returns a Category id.
   */
  async resolveCategoryId(key?: string): Promise<string> {
    if (key) {
      const found = await this.categories.findOne({ where: { key } });
      if (found) return found.id;
    }
    const any = await this.categories.findOne({ where: {} });
    if (!any) throw new Error('No categories configured');
    return any.id;
  }
}

/* ═══════════════ Pure helpers (parse ngày, slot, chi phí) ═══════════════ */

/** Bóc ngày/số người/chi phí/lưu trú/di chuyển/bữa ăn từ câu user (tiếng Việt). */
export function extractFinalizeSlots(query: string): {
  startDate?: string;
  endDate?: string;
  maxMembers?: number;
  pricePerPerson?: number;
  accommodation?: string;
  transport?: string;
  meals?: string;
} {
  const q = query.toLowerCase();
  const result: {
    startDate?: string;
    endDate?: string;
    maxMembers?: number;
    pricePerPerson?: number;
    accommodation?: string;
    transport?: string;
    meals?: string;
  } = {};

  // Ngày dạng dd/mm[/yyyy] (cả - .) HOẶC "ngày 20 tháng 12".
  const dates: string[] = [];
  // Phần năm chỉ nhận khi dùng CÙNG dấu phân tách (\2) với d/m. Nhờ vậy dải ngày
  // "29/7-30/7" không bị hiểu "-30" là năm (dấu nối "-" ≠ dấu trong ngày "/"),
  // mà tách đúng thành 2 ngày 29/7 và 30/7.
  for (const m of q.matchAll(
    /(\d{1,2})\s*([/\-.])\s*(\d{1,2})(?:\s*\2\s*(\d{2,4}))?/g,
  )) {
    const iso = parseVnDate(m[1], m[3], m[4]);
    if (iso) dates.push(iso);
  }
  for (const m of q.matchAll(/ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})(?:\s+năm\s+(\d{4}))?/g)) {
    const iso = parseVnDate(m[1], m[2], m[3]);
    if (iso) dates.push(iso);
  }
  if (dates.length >= 1) result.startDate = dates[0];
  if (dates.length >= 2) result.endDate = dates[1];

  // Số người: "5 người", "tối đa 8".
  const members =
    q.match(/(\d+)\s*(?:người|thành viên|bạn|nguoi)/) || q.match(/tối đa\s*(\d+)/);
  if (members) result.maxMembers = Number(members[1]);

  // Chi phí: "2 triệu", "500k", "1.500.000đ".
  const price = parsePrice(q);
  if (price != null) result.pricePerPerson = price;

  // Lưu trú / di chuyển / bữa ăn — tách câu theo dấu phẩy/chấm phẩy rồi gán
  // mệnh đề chứa từ khoá đặc trưng cho đúng field. Tránh regex "ôm" cả câu.
  const clauses = query
    .split(/[,;\n]+/)
    .map((c) => c.trim())
    .filter(Boolean);
  for (const raw of clauses) {
    const c = raw.toLowerCase();
    if (
      !result.accommodation &&
      /(khách sạn|homestay|resort|nhà nghỉ|lưu trú|villa|bungalow|nhà dân|cắm trại|lều)/.test(c)
    ) {
      result.accommodation = cleanInclusion(raw);
    } else if (
      !result.transport &&
      /(máy bay|tàu hoả|tàu hỏa|tàu|xe khách|xe máy|ô tô|oto|ô-tô|xe limousine|limousine|xe riêng|đi bằng|phương tiện|di chuyển)/.test(c)
    ) {
      result.transport = cleanInclusion(raw);
    } else if (
      !result.meals &&
      /(buffet|bữa ăn|ăn uống|ẩm thực|tự túc ăn|ăn sáng|ăn trưa|ăn tối|suất ăn|đồ ăn)/.test(c)
    ) {
      result.meals = cleanInclusion(raw);
    }
  }

  return result;
}

/** Dọn mệnh đề inclusion: bỏ vài từ dẫn đầu thừa, giới hạn độ dài. */
function cleanInclusion(s: string): string {
  return s
    .replace(/^(ở|tại|đi bằng|di chuyển bằng|di chuyển|ăn|phương tiện|lưu trú|nghỉ ở|nghỉ tại|nghỉ)\s+/i, '')
    .trim()
    .slice(0, 60);
}

/** Ghép d/m/y → ISO (yyyy-mm-dd). Trả null nếu vô lý.
 *  Năm trống: mặc định năm HIỆN TẠI; nếu ngày đó đã trôi qua (so với hôm nay)
 *  thì tự nhảy sang năm sau để không tạo chuyến trong quá khứ. */
export function parseVnDate(d: string, m: string, y?: string, now: Date = new Date()): string | null {
  const day = Number(d);
  const month = Number(m);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');

  if (y) {
    let year = Number(y);
    if (year < 100) year += 2000; // "26" → 2026
    return `${year}-${mm}-${dd}`;
  }

  // Không có năm → dùng năm hiện tại; nếu đã qua thì +1 năm.
  const curYear = now.getFullYear();
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  let candidate = new Date(curYear, month - 1, day).getTime();
  let year = curYear;
  if (candidate < todayMid) {
    year = curYear + 1;
  }
  return `${year}-${mm}-${dd}`;
}

/** Bóc số tiền VND từ chuỗi: "2 triệu", "500k", "1tr5", "2 triệu rưỡi", "1.500.000". */
export function parsePrice(q: string): number | null {
  // triệu / tr — hỗ trợ "2 triệu rưỡi", "1tr5" (rưỡi = +0.5, "tr5" = .5 triệu).
  const mil = q.match(/(\d+(?:[.,]\d+)?)\s*(?:triệu|tr)\s*(rưỡi|ruoi|\d)?/);
  if (mil) {
    let val = parseFloat(mil[1].replace(',', '.'));
    const tail = mil[2];
    if (tail === 'rưỡi' || tail === 'ruoi') val += 0.5;
    else if (tail && /\d/.test(tail)) val += Number(tail) / 10; // "1tr5" → 1.5
    return Math.round(val * 1_000_000);
  }
  // nghìn / ngàn / k
  const k = q.match(/(\d+(?:[.,]\d+)?)\s*(?:nghìn|ngàn|k)\b/);
  if (k) return Math.round(parseFloat(k[1].replace(',', '.')) * 1_000);
  // số có dấu phân cách hàng nghìn + đ/vnd
  const plain = q.match(/(\d{1,3}(?:[.,]\d{3})+)\s*(?:đ|vnd|đồng)?/);
  if (plain) return Number(plain[1].replace(/[.,]/g, ''));
  return null;
}

/** Cộng n ngày vào 1 ngày ISO. */
export function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Số ngày bao gồm cả 2 đầu mút (inclusive). */
export function daysBetween(startIso: string, endIso: string): number {
  const a = new Date(startIso).getTime();
  const b = new Date(endIso).getTime();
  return Math.floor((b - a) / 86_400_000) + 1;
}

/** Gợi ý chi phí/người theo số ngày khi user chưa nêu (ước tính thô VND). */
export function suggestBudget(s: AiTripSuggestion): number {
  const days = s.durationDays ?? 3;
  return days * 1_200_000; // ~1.2tr/ngày/người: ăn ở + di chuyển + vé
}