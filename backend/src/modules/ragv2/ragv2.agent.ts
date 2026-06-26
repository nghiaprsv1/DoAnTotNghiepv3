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
- User muốn TẠO/LÊN lộ trình mới → trước hết search_places + search_documents để có dữ liệu thật,
  rồi gọi create_itinerary với context là tóm tắt dữ liệu đó.
- CHỈ đặt browse=true khi user muốn xem DANH SÁCH CHUNG ("liệt kê tất cả địa điểm", "có những HDV nào").
  KHI user hỏi về MỘT điểm đến/chủ đề cụ thể mà công cụ trả "không tìm thấy" → ĐỪNG thử lại với
  browse=true (sẽ ra kết quả linh tinh không liên quan). Thay vào đó dùng search_documents, hoặc nói
  thật là hệ thống chưa có dữ liệu về nơi đó.
- KHÔNG gọi lại một công cụ với tham số gần giống lần trước. Tối đa 1-2 công cụ là đủ cho câu hỏi thường.
- Khi đã đủ dữ liệu, trả lời ngắn gọn, thân thiện, giới thiệu kết quả tìm được và mời user bấm thẻ
  bên dưới để xem chi tiết. Nếu không tìm thấy gì, nói thật là chưa có dữ liệu.

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
  logger?: Logger;
}): Promise<AgentRunResult> {
  const { question, chat, deps, maxSteps, draft, history } = opts;
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

  const messages: AgentMessage[] = [
    ...priorTurns,
    {
      role: 'user',
      content:
        `${SYSTEM_PROMPT}${draftContext}` +
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
      temperature: 0.3,
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
 * Giữ lại thẻ mà câu trả lời CÓ nhắc tới (so khớp token tên thẻ, đã bỏ dấu).
 * Lý do: agent gom thẻ từ mọi lần gọi tool — kể cả lần browse trả rác — nhưng
 * câu trả lời thường chỉ nói về vài mục thật sự liên quan. Chỉ hiện thẻ khớp lời.
 * An toàn: nếu KHÔNG thẻ nào khớp (answer dạng liệt kê/không nêu tên) → trả [] để
 * khỏi hiện rác; nhưng nếu mọi thẻ đều bị loại mà answer rõ ràng liệt kê chung thì
 * giữ nguyên (xử lý ở dưới qua ngưỡng).
 */
function filterCardsByAnswer(cards: RetrievedCard[], answer: string): RetrievedCard[] {
  if (cards.length === 0) return cards;
  const ans = normalizeVi(answer);
  const kept = cards.filter((c) => {
    // Token có nghĩa trong tên thẻ (≥3 ký tự) — cần ít nhất 1 token xuất hiện ở answer.
    const tokens = normalizeVi(c.title)
      .split(/\s+/)
      .filter((w) => w.length >= 3);
    if (tokens.length === 0) return false;
    const hits = tokens.filter((t) => ans.includes(t)).length;
    // Khớp khi: có ≥2 token trùng, HOẶC trùng ≥ nửa số token (tên ngắn 1-2 từ).
    return hits >= 2 || hits >= Math.ceil(tokens.length / 2);
  });
  return kept;
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
