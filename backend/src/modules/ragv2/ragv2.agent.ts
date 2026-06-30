import { Logger } from '@nestjs/common';
import { type AgentMessage, type RagChat } from './lib/rag-llm.interface';
import { buildToolDefs, executeTool, type ToolDeps } from './lib/rag-tools';
import { type RetrievedCard } from './lib/retrievers/retriever.interface';
import type { RagStep, RagItinerarySuggestion } from './ragv2.service';

/**
 * RAG v2 AGENT — vòng ReAct (Reason → Act → Observe) tool-calling.
 *
 * Khác PIPELINE cũ (code điều phối cứng theo Router): ở đây LLM TỰ QUYẾT mỗi
 * vòng — gọi tool nào, mấy lần, có dựng lộ trình không, khi nào đủ để trả lời.
 * Ta chỉ chạy tool LLM yêu cầu rồi nhồi observation lại, lặp đến khi LLM trả
 * lời thẳng (không gọi tool nữa) hoặc chạm trần số vòng.
 */

const SYSTEM_PROMPT = `Bạn là trợ lý du lịch TripMate, trả lời bằng tiếng Việt, xưng "mình".
Bạn có các CÔNG CỤ để tra dữ liệu THẬT trong hệ thống và kho tài liệu. Hãy DÙNG công cụ
để lấy dữ liệu thật trước khi trả lời — TUYỆT ĐỐI không bịa chuyến đi, địa điểm, HDV, giá cả.

NGUYÊN TẮC:
- Phân tích câu hỏi → chọn công cụ phù hợp (có thể gọi nhiều công cụ, nhiều lần).
- QUAN TRỌNG — phân biệt "CÁCH DÙNG" với "TÌM DỮ LIỆU":
  • Hỏi CÁCH/QUY TRÌNH/HƯỚNG DẪN ("cách thuê HDV", "làm sao đặt chuyến", "cách nạp ví", "đăng ký HDV thế
    nào", "cách tạo chuyến") → đây là HƯỚNG DẪN SỬ DỤNG WEBSITE → DÙNG search_documents, KHÔNG query DB.
  • Tìm/liệt kê THỰC THỂ cụ thể ("HDV ở Phú Quốc", "chuyến đi Đà Lạt", "địa điểm ở Sapa") → query DB
    bằng search_trips / search_places / search_guides / search_posts.
- Hỏi CHUYẾN/tour cụ thể → search_trips. Hỏi ĐỊA ĐIỂM cụ thể → search_places. Tìm HDV cụ thể → search_guides.
  Hỏi review/kinh nghiệm → search_posts. Kiến thức nền/mùa đẹp/đặc sản/lưu ý/CÁCH DÙNG WEB → search_documents.
- THUỘC TÍNH của một ĐỊA ĐIỂM đã biết tên (giá vé/phí vào cổng, giờ mở cửa, "phun lửa mấy giờ", có gì
  chơi, đặc điểm…) → DÙNG search_places (thẻ địa điểm CHỨA SẴN các thông tin này). ĐỪNG đổ sang
  search_documents cho thuộc tính địa điểm. Chỉ khi search_places trả "không tìm thấy" mới cân nhắc khác.
- User muốn TẠO/LÊN lộ trình mới → trước hết search_places + search_documents để có dữ liệu thật,
  rồi gọi create_itinerary với context là tóm tắt dữ liệu đó.
- CHỈ đặt browse=true khi user muốn xem DANH SÁCH CHUNG ("liệt kê tất cả địa điểm", "có những HDV nào").
  KHI user hỏi về MỘT điểm đến/chủ đề cụ thể mà công cụ trả "không tìm thấy" → ĐỪNG thử lại với
  browse=true (sẽ ra kết quả linh tinh không liên quan). Thay vào đó dùng search_documents, hoặc nói
  thật là hệ thống chưa có dữ liệu về nơi đó.
- ĐÚNG ĐỊA PHƯƠNG (RẤT QUAN TRỌNG): khi user nêu một tỉnh/thành cụ thể (vd "ở Đà Nẵng", "chỉ Đà Nẵng"),
  query truyền cho công cụ PHẢI chứa tên tỉnh/thành đó để lọc đúng nơi. TUYỆT ĐỐI KHÔNG liệt kê địa
  điểm thuộc tỉnh KHÁC (vd hỏi Đà Nẵng mà trả Vịnh Hạ Long là SAI). Nếu kết quả công cụ trả về có mục
  thuộc tỉnh khác nơi user hỏi → BỎ mục đó khỏi câu trả lời, không nhắc tới.
- HỎI "ĐỊA ĐIỂM KHÁC / THÊM / CÒN GÌ NỮA": user muốn các mục MỚI, CHƯA được nhắc ở các lượt trước.
  Hãy nhìn lại những tên đã liệt kê trong hội thoại và CHỌN trong kết quả công cụ những mục KHÁC (chưa
  từng nêu). Công cụ trả nhiều hơn 4 mục → ưu tiên các mục chưa xuất hiện. Nếu đã hết mục mới thì nói
  thật là "đã giới thiệu gần hết các địa điểm nổi bật rồi".
- KHÔNG gọi lại một công cụ với tham số gần giống lần trước. Tối đa 1-2 công cụ là đủ cho câu hỏi thường.
- Khi đã đủ dữ liệu, trả lời ngắn gọn, thân thiện, giới thiệu kết quả tìm được và mời user bấm thẻ
  bên dưới để xem chi tiết. Nếu không tìm thấy gì, nói thật là chưa có dữ liệu.

CHỐNG BỊA (TUYỆT ĐỐI tuân thủ):
- CHỈ dùng dữ liệu do công cụ trả về. KHÔNG thêm kiến thức ngoài, KHÔNG suy đoán.
- search_documents trả đoạn kèm TÊN TỆP (chủ đề/địa danh của đoạn). Nếu người dùng hỏi nơi A mà
  đoạn lại nói về nơi B (vd hỏi "Mù Cang Chải" nhưng đoạn là "CaoBang.txt") → KHÔNG được gán nội dung
  nơi B cho nơi A. Khi không đoạn nào nói đúng nơi/chủ đề được hỏi → trả lời thật: "hệ thống chưa có
  thông tin về <nơi đó>", và có thể gợi ý các nơi ĐÃ có tài liệu (Cao Bằng, Lào Cai, Phú Quốc, Vũng Tàu).
- Chỉ khẳng định một HDV "nói tiếng X" / có đặc điểm nào đó khi dữ liệu công cụ GHI RÕ (trường ngôn ngữ,
  chuyên môn…). Nếu dữ liệu không ghi, đừng suy diễn — nói rằng thông tin đó chưa được cập nhật.
- KHÔNG biến mô tả CHUNG CHUNG thành tuyên bố CỤ THỂ. Phải GIỮ NGUYÊN mức độ chính xác của dữ liệu,
  KHÔNG "nâng cấp" thành nhất/đầu tiên/lớn nhất/dài nhất/duy nhất nếu dữ liệu không nói y như vậy.
  Ví dụ: dữ liệu ghi "cáp treo đạt NHIỀU KỶ LỤC thế giới" → CHỈ được viết "đạt nhiều kỷ lục thế giới",
  TUYỆT ĐỐI KHÔNG viết "cáp treo DÀI NHẤT thế giới" (đó là bịa con số/thứ hạng cụ thể không có trong dữ
  liệu). Khi không chắc con số/thứ hạng chính xác → diễn đạt đúng như nguồn, không tự thêm.
- GIỮ NGUYÊN VĂN MỌI CON SỐ, ĐƠN VỊ, GIÁ TIỀN, NGÀY GIỜ trong dữ liệu — chép đúng từng chữ. TUYỆT ĐỐI
  KHÔNG làm tròn, KHÔNG đổi đơn vị (tỉ ⇄ triệu ⇄ nghìn), KHÔNG "sửa cho hợp lý" dù con số trông vô lý.
  Ví dụ: dữ liệu ghi "vé người lớn 7 tỉ VND" → PHẢI viết "7 tỉ VND", KHÔNG được tự đổi thành "7 triệu".
  Nhiệm vụ của bạn là TRÍCH DẪN dữ liệu, KHÔNG phải đánh giá hay chỉnh sửa nó. Nếu thấy dữ liệu bất
  thường, cứ nêu đúng như nguồn (có thể nói thêm "theo dữ liệu hệ thống").

NGỮ CẢNH HỘI THOẠI (RẤT QUAN TRỌNG):
- Các lượt trước CHỈ để tham khảo. TRỌNG TÂM là "CÂU HỎI HIỆN TẠI" ở cuối.
- Hãy tự xác định câu hiện tại là TIẾP NỐI lượt trước hay là CHỦ ĐỀ MỚI:
  • Nếu đổi sang điểm đến/chủ đề KHÁC (vd trước hỏi Phú Quốc, giờ hỏi Lào Cai; trước tạo lộ trình,
    giờ hỏi HDV) → coi là YÊU CẦU MỚI HOÀN TOÀN. Bắt đầu lại bằng công cụ tìm kiếm phù hợp, TUYỆT ĐỐI
    KHÔNG bám/sửa lộ trình hay kết quả của lượt trước.
  • Chỉ TIẾP NỐI khi câu hiện tại rõ ràng nói về CÙNG chủ đề (vd "thêm 1 ngày", "đổi ngày 2 sang biển",
    "ở đó còn gì chơi", "rẻ hơn được không").
- Đừng để chủ đề cũ "dính" vào câu mới. Mỗi câu hỏi mới về nơi khác là một nhiệm vụ độc lập.`;

/** Kết quả chạy agent — gộp vào RagAskResult của service. */
export interface AgentRunResult {
  answer: string;
  cards: RetrievedCard[];
  suggestion?: RagItinerarySuggestion;
  steps: RagStep[];
}

/**
 * Chạy vòng agent. `chat.chatWithTools` là điểm LLM điều phối; `deps` cung cấp
 * executor cho các tool (4 retriever DB + doc search + dựng/chỉnh lộ trình).
 * `draft` (nếu có) = lộ trình nháp đang hiển thị → nạp thêm tool revise_itinerary
 * + đưa vào ngữ cảnh để LLM tự quyết chỉnh sửa / tạo mới / trả lời câu hỏi.
 */
export async function runRagAgent(opts: {
  question: string;
  chat: RagChat;
  deps: ToolDeps;
  maxSteps: number;
  draft?: RagItinerarySuggestion | null;
  /** Lịch sử hội thoại (các lượt trước) để agent hiểu câu nối tiếp — KHÔNG gồm câu hiện tại. */
  history?: { role: 'user' | 'assistant'; content: string }[];
  /** Router phát hiện user muốn TẠO lộ trình mới → ưu tiên tool create_itinerary. */
  wantsItinerary?: boolean;
  /**
   * User ĐÃ nêu rõ số ngày (hoặc khoảng ngày đi-về) cho lộ trình chưa. Nếu CHƯA
   * mà lại muốn tạo lộ trình → agent phải HỎI user, KHÔNG tự chọn số ngày.
   */
  daysSpecified?: boolean;
  logger?: Logger;
}): Promise<AgentRunResult> {
  const { question, chat, deps, maxSteps, draft, history, wantsItinerary, daysSpecified } = opts;
  const steps: RagStep[] = [];
  const cards: RetrievedCard[] = [];
  // KHÔNG mặc định suggestion = draft. Lộ trình CHỈ hiện lại khi lượt NÀY thực sự
  // tạo/sửa nó (qua tool create_itinerary / revise_itinerary) → tránh "dính" lộ
  // trình cũ vào câu hỏi mới đã đổi chủ đề.
  let suggestion: RagItinerarySuggestion | undefined;
  const hasDraft = !!(draft && draft.title);
  const tools = buildToolDefs(hasDraft);

  // Ngữ cảnh lộ trình nháp (nếu có) để LLM biết "lộ trình đang hiển thị" là gì.
  const draftContext = hasDraft
    ? `\n\nLỘ TRÌNH ĐANG HIỂN THỊ: "${draft!.title}" — ${draft!.destination}, ${draft!.durationDays} ngày.` +
      ` Nếu user muốn THAY ĐỔI lộ trình này → dùng revise_itinerary. Nếu user hỏi thông tin khác` +
      ` hoặc muốn lộ trình MỚI ở nơi khác → dùng các công cụ tìm kiếm / create_itinerary như bình thường` +
      ` và BỎ QUA lộ trình cũ này.`
    : '';

  // Lịch sử hội thoại → các lượt user/assistant RIÊNG BIỆT (không gộp 1 cục) để
  // agent thấy được mạch hội thoại nhưng vẫn tách bạch từng lượt. Cắt 6 lượt gần
  // nhất, bỏ lượt rỗng. System prompt + câu hiện tại đặt ở LƯỢT CUỐI (nhãn rõ
  // "CÂU HỎI HIỆN TẠI") để model biết đâu là trọng tâm cần xử lý.
  const priorTurns: AgentMessage[] = (history ?? [])
    .filter((h) => h.content?.trim())
    .slice(-6)
    .map((h) => ({ role: h.role, content: h.content }));

  // Chỉ thị TẠO lộ trình: khi Router nhận diện user muốn lập lộ trình mới, ép agent
  // đi đúng quy trình create_itinerary (gom dữ liệu thật trước, rồi dựng) thay vì
  // chỉ liệt kê chuyến có sẵn bằng search_trips.
  let itineraryDirective = '';
  if (wantsItinerary && !(draft && draft.title)) {
    if (daysSpecified === false) {
      // Muốn tạo lộ trình NHƯNG chưa nêu số ngày → HỎI THẲNG số ngày + ngày khởi
      // hành. TUYỆT ĐỐI không gọi search_places/search_documents/create_itinerary
      // và KHÔNG liệt kê lại địa điểm (các địa điểm đã có ở lượt trước trong
      // lịch sử) — tránh lặp nội dung thừa.
      itineraryDirective =
        `\n\nLƯU Ý ĐIỀU HƯỚNG: Người dùng muốn TẠO lộ trình nhưng CHƯA cho biết số ngày.` +
        ` HÃY HỎI NGẮN GỌN số ngày dự định đi và ngày khởi hành. TUYỆT ĐỐI KHÔNG gọi bất kỳ` +
        ` tool nào (không search_places, không search_documents, không create_itinerary) và` +
        ` KHÔNG liệt kê lại các địa điểm đã nêu ở lượt trước. Chỉ hỏi đúng một câu về số ngày + ngày đi.`;
    } else {
      itineraryDirective =
        `\n\nLƯU Ý ĐIỀU HƯỚNG: Người dùng muốn TẠO/LÊN một lộ trình MỚI. Hãy: (1) gọi search_places` +
        ` và/hoặc search_documents để lấy địa điểm/đặc sản THẬT của điểm đến; (2) sau đó BẮT BUỘC gọi` +
        ` create_itinerary với "request" là yêu cầu nguyên văn và "context" là tóm tắt dữ liệu thật vừa thu` +
        ` thập. ĐỪNG chỉ dừng ở việc liệt kê chuyến có sẵn — phải dựng lộ trình chi tiết theo ngày.`;
    }
  }

  const messages: AgentMessage[] = [
    ...priorTurns,
    {
      role: 'user',
      content:
        `${SYSTEM_PROMPT}${draftContext}${itineraryDirective}` +
        `\n\n=== CÂU HỎI HIỆN TẠI (hãy xử lý câu này, các lượt trên chỉ để tham khảo) ===\n${question}`,
    },
  ];

  const t0 = Date.now();
  steps.push({
    key: 'agent_start',
    title: 'Khởi tạo agent (nạp công cụ + câu hỏi)',
    ms: 0,
    detail: {
      model: chat.model,
      maxSteps,
      question,
      hasDraft,
      historyTurns: priorTurns.length,
      tools: tools.map((t) => ({ name: t.name, description: t.description })),
      systemPrompt: SYSTEM_PROMPT + draftContext,
    },
  });

  let answer = '';
  let round = 0;
  for (; round < maxSteps; round++) {
    const r0 = Date.now();
    const res = await chat.chatWithTools(messages, tools, {
      // Temp thấp để bám dữ liệu, giảm "sáng tạo" gây bịa (vd tự nâng "nhiều kỷ
      // lục" thành "dài nhất thế giới").
      temperature: 0.2,
      maxTokens: 1024,
    });

    // LLM trả lời thẳng (không gọi tool) → đây là câu trả lời cuối.
    if (!res.toolCalls.length) {
      answer = res.content;
      break;
    }

    // LLM yêu cầu gọi tool → ghi lại lượt assistant (tool_calls) vào hội thoại.
    messages.push({ role: 'assistant', content: res.content, toolCalls: res.toolCalls });

    // Chạy từng tool, nhồi observation lại (role 'tool').
    const ranThisRound: {
      name: string;
      arguments: Record<string, unknown>;
      observation: string;
      cards: number;
      suggestion: boolean;
      docSearch?: unknown;
    }[] = [];
    for (const call of res.toolCalls) {
      const out = await executeTool(call.name, call.arguments, deps);
      if (out.cards?.length) mergeCards(cards, out.cards);
      if (out.suggestion) suggestion = out.suggestion as RagItinerarySuggestion;
      messages.push({
        role: 'tool',
        toolCallId: call.id,
        name: call.name,
        content: out.observation,
      });
      ranThisRound.push({
        name: call.name,
        arguments: call.arguments,
        observation: out.observation,
        cards: out.cards?.length ?? 0,
        suggestion: !!out.suggestion,
        // Chi tiết embedding + hybrid + rerank của search_documents → FE hiển thị.
        docSearch: out.docSearch,
      });
    }

    steps.push({
      key: 'agent_tool',
      title: `Vòng ${round + 1}: gọi công cụ (${ranThisRound.map((t) => t.name).join(', ')})`,
      ms: Date.now() - r0,
      detail: {
        round: round + 1,
        thought: res.content || '(model gọi công cụ ngay, không kèm lời dẫn)',
        calls: ranThisRound,
      },
    });
  }

  // Chạm trần vòng mà chưa có câu trả lời → ép LLM chốt 1 câu từ dữ liệu đã có.
  if (!answer) {
    answer = await finalAnswer(chat, messages).catch(() => '');
    if (!answer) {
      answer =
        cards.length || suggestion
          ? 'Mình đã tìm được một số kết quả bên dưới, bạn xem thử nhé!'
          : 'Mình chưa tìm thấy thông tin phù hợp. Bạn thử hỏi rõ hơn về điểm đến, chuyến đi hoặc địa điểm nhé.';
    }
  }

  // CHẶN BỊA "NHẤT/DUY NHẤT/ĐẦU TIÊN … (thế giới/Việt Nam)" — lớp deterministic
  // sau LLM: nếu tuyên bố tuyệt đối KHÔNG có trong dữ liệu công cụ trả về thì cắt
  // bỏ (vd dữ liệu ghi "đạt nhiều kỷ lục thế giới" mà LLM viết "cáp treo DÀI NHẤT
  // thế giới" → cắt mệnh đề đó). Bằng chứng = mọi observation tool trong hội thoại.
  const evidence = messages
    .filter((m) => m.role === 'tool')
    .map((m) => m.content ?? '')
    .join('\n');
  answer = stripUnsupportedSuperlatives(answer, evidence);
  // CHẶN ĐỔI ĐƠN VỊ TIỀN: nếu LLM giữ đúng con số nhưng đổi đơn vị (vd dữ liệu
  // "7 tỉ" → LLM viết "7 triệu" cho "hợp lý") thì trả lại đơn vị ĐÚNG theo dữ liệu.
  answer = fixCurrencyUnits(answer, evidence);

  // LỌC THẺ theo câu trả lời cuối: chỉ giữ thẻ mà answer THỰC SỰ nhắc tên. Tránh
  // cảnh "answer nói Phú Quốc/Vũng Tàu (từ tài liệu) nhưng thẻ lại là Hạ Long/Sapa
  // (rác do agent lỡ browse cả DB)". Nếu lọc sạch mà answer có vẻ liệt kê → giữ
  // nguyên (đề phòng tên thẻ không trùng câu chữ).
  const shownCards = filterCardsByAnswer(cards, answer);

  steps.push({
    key: 'agent_final',
    title: 'Tổng hợp câu trả lời cuối',
    ms: Date.now() - t0,
    detail: {
      model: chat.model,
      rounds: round,
      answerChars: answer.length,
      cardsCollected: cards.length,
      cardsShown: shownCards.length,
      itineraryBuilt: !!suggestion,
    },
  });

  return { answer, cards: shownCards, suggestion, steps };
}

/** Bỏ dấu tiếng Việt + lowercase để so khớp tên thẻ với câu trả lời. */
function normalizeVi(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');
}

/**
 * Cắt các tuyên bố TUYỆT ĐỐI ("… nhất/duy nhất/đầu tiên … (thế giới|Việt Nam|…)")
 * mà BẰNG CHỨNG (observation tool) KHÔNG hề chứa → chống LLM tự "nâng cấp" mô tả
 * chung thành tuyên bố cụ thể (vd dữ liệu "đạt nhiều kỷ lục thế giới" → LLM viết
 * "cáp treo DÀI NHẤT thế giới"). Cách làm: bắt cụm <đặc tính> + <phạm vi>, trích
 * "lõi đặc tính" (vd "dài nhất" / "duy nhất"); nếu evidence CÓ lõi đó → giữ
 * nguyên (tuyên bố có thật trong dữ liệu), nếu KHÔNG → xoá cụm tuyên bố.
 */
function stripUnsupportedSuperlatives(answer: string, evidence: string): string {
  const ev = normalizeVi(evidence);
  const SCOPE = '(?:thế giới|toàn cầu|việt nam|đông nam á|châu á|hành tinh)';
  // Bắt: <lõi đặc tính> + [tối đa 3 từ đệm + <phạm vi>]? + [liên từ "và/cùng/,"]?
  //   lõi = "<1 từ> nhất"  hoặc  "duy nhất|đầu tiên|số một|số 1"
  // Scope là TÙY CHỌN (không bắt buộc đứng ngay sau) để bắt cả "dài nhất VÀ đạt
  // nhiều kỷ lục thế giới" — nơi "dài nhất" cách "thế giới" vài từ. Liên từ phía
  // sau được nuốt kèm để khi cắt không để lại "… và …" lủng củng.
  const re = new RegExp(
    `(\\p{L}+\\s+nhất|duy nhất|đầu tiên|số một|số 1)((?:\\s+\\p{L}+){0,3}?\\s+${SCOPE})?(\\s+(?:và|cùng)\\b|\\s*,)?`,
    'giu',
  );
  return answer
    .replace(re, (full: string, core: string) => {
      const coreN = normalizeVi(core ?? '').trim();
      // Evidence chứa đúng lõi đặc tính → tuyên bố có thật → GIỮ NGUYÊN (cả scope/liên từ).
      if (coreN && ev.includes(coreN)) return full;
      // Không có trong dữ liệu → BỎ cả cụm (gồm liên từ đã nuốt) để câu gọn.
      return '';
    })
    // Dọn dấu/khoảng trắng/liên từ thừa sau khi xoá.
    .replace(/\s*,\s*,/g, ',')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/,\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Sửa ĐƠN VỊ TIỀN bị LLM đổi: khi câu trả lời giữ đúng CON SỐ nhưng đổi đơn vị
 * (vd dữ liệu "7 tỉ VND" → LLM viết "7 triệu VND" cho "hợp lý") → trả lại đơn vị
 * ĐÚNG theo dữ liệu. Cách làm: với mỗi cụm "<số> <đơn vị>" trong câu trả lời, nếu
 * dữ liệu (evidence) có CÙNG con số đó nhưng đơn vị KHÁC → thay đơn vị trong câu
 * trả lời cho khớp dữ liệu. Chỉ đụng khi con số trùng khít (tránh sửa bừa).
 */
function fixCurrencyUnits(answer: string, evidence: string): string {
  const UNIT = '(?:tỉ|tỷ|triệu|nghìn|ngàn|đồng|đ|k|vnd|vnđ)';
  const NUM = '\\d{1,3}(?:[.,]\\d{3})*(?:[.,]\\d+)?';
  const re = new RegExp(`(${NUM})\\s*(${UNIT})`, 'giu');
  return answer.replace(re, (full: string, num: string, unit: string) => {
    // Tìm trong evidence GỐC (CÒN DẤU) cùng con số này đi với đơn vị NÀO. Dùng
    // \b để khớp đúng số, cho phép dấu . , giữa các nhóm nghìn.
    const numPat = num.replace(/[.,]/g, '[.,]?');
    const evRe = new RegExp(`\\b${numPat}\\s*(${UNIT})`, 'iu');
    const m = evRe.exec(evidence);
    if (!m) return full; // dữ liệu không có con số này → không đụng
    const evUnit = m[1];
    // Đơn vị trong dữ liệu khác đơn vị LLM viết → sửa về đơn vị dữ liệu.
    if (evUnit.toLowerCase() !== unit.toLowerCase()) {
      return `${num} ${evUnit}`;
    }
    return full;
  });
}

/**
 * Giu lai the ma cau tra loi THUC SU nhac toi. Truoc day khop theo token le nen
 * cac the "ho hang" cung 1 tu chung (vd "Cau Vang", "Cau Song Han" deu co "cau")
 * lot theo du answer khong he noi toi -> hien the thua. Nay khop CHAT theo TEN
 * DAY DU: chi giu the khi ten (da bo dau + bo phan trong ngoac) xuat hien NHU MOT
 * CUM LIEN trong cau tra loi. An toan: tat ca deu bi loai van tra [] (khong hien rac).
 */
function filterCardsByAnswer(cards: RetrievedCard[], answer: string): RetrievedCard[] {
  if (cards.length === 0) return cards;
  const ans = normalizeVi(answer);
  return cards.filter((c) => {
    // Bo phan trong ngoac (vd "Cong vien Chau A (Asia Park)" -> "cong vien chau a").
    const name = normalizeVi(c.title.replace(/\(.*?\)/g, '').trim());
    if (!name) return false;
    // Khop khi ten day du xuat hien nhu mot cum lien trong cau tra loi.
    return ans.includes(name);
  });
}

/** Gộp thẻ mới vào danh sách, khử trùng theo source+id (tool gọi lặp không nhân đôi). */
function mergeCards(acc: RetrievedCard[], incoming: RetrievedCard[]): void {
  const seen = new Set(acc.map((c) => `${c.source}:${c.id}`));
  for (const c of incoming) {
    const k = `${c.source}:${c.id}`;
    if (!seen.has(k)) {
      seen.add(k);
      acc.push(c);
    }
  }
}

/**
 * Ép LLM chốt câu trả lời khi chạm trần số vòng: gửi lại hội thoại + yêu cầu trả
 * lời thẳng KHÔNG gọi tool nữa (dùng complete thường, không truyền tools).
 */
async function finalAnswer(chat: RagChat, messages: AgentMessage[]): Promise<string> {
  const transcript = messages
    .map((m) => {
      if (m.role === 'tool') return `[KẾT QUẢ ${m.name}]: ${m.content}`;
      if (m.role === 'assistant' && m.toolCalls?.length)
        return `[TRỢ LÝ gọi]: ${m.toolCalls.map((t) => t.name).join(', ')}`;
      return `[${m.role === 'user' ? 'NGƯỜI DÙNG' : 'TRỢ LÝ'}]: ${m.content}`;
    })
    .join('\n');
  return chat.complete({
    system:
      'Bạn là trợ lý du lịch TripMate. Dựa trên dữ liệu đã thu thập dưới đây, trả lời người dùng ' +
      'bằng tiếng Việt, ngắn gọn, KHÔNG bịa thêm. Mời user bấm thẻ bên dưới để xem chi tiết.',
    prompt: `Hội thoại + dữ liệu đã thu thập:\n${transcript}\n\nTrả lời cuối cùng:`,
    temperature: 0.3,
    maxTokens: 1024,
  });
}
