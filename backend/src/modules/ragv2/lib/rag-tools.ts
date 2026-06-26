import { type RagSource, type RetrievedCard, type RetrieverFilters, type RagRetriever } from './retrievers/retriever.interface';
import { type ToolDef } from './rag-llm.interface';

/**
 * REGISTRY TOOL cho RAG v2 Agent — biến các "Search module" (retriever) + doc
 * search + dựng lộ trình thành TOOL mà LLM tự gọi (function calling).
 *
 * Khác pipeline cũ (code điều phối cứng theo Router): ở đây MỖI tool là 1 hành
 * động độc lập, LLM tự quyết gọi tool nào / mấy lần / có dựng lộ trình không.
 * Tool định nghĩa = schema (cho LLM hiểu) + executor (chạy thật, trả observation
 * + cards/suggestion để FE hiển thị).
 */

/** Một đoạn tài liệu truy hồi được (cho tool search_documents). */
export interface DocHit {
  docName: string;
  chunkIndex: number;
  content: string;
  score: number;
}

/** Phụ thuộc executor cần — service truyền vào (tránh phụ thuộc vòng). */
export interface ToolDeps {
  /** Map nguồn DB → retriever (trip/place/guide/post). */
  retrievers: Record<Exclude<RagSource, 'doc'>, RagRetriever>;
  /** Tra tài liệu vector (embed → hybrid search), trả top đoạn. */
  searchDocuments: (query: string, topK: number) => Promise<DocHit[]>;
  /** Dựng lộ trình RAG-grounded từ yêu cầu + ngữ cảnh đã thu thập. */
  createItinerary: (request: string, context: string) => Promise<unknown | null>;
  /** Chỉnh sửa lộ trình nháp hiện có theo yêu cầu (chỉ có khi đang có draft). */
  reviseItinerary?: (request: string) => Promise<unknown | null>;
  /** Số thẻ tối đa mỗi nguồn DB. */
  dbLimit: number;
  /** Số đoạn tài liệu tối đa cho search_documents. */
  docTopK: number;
}

/** Kết quả 1 lần chạy tool: observation cho LLM + dữ liệu cho FE. */
export interface ToolResult {
  /** Văn bản tóm tắt kết quả, nhồi lại cho LLM (role 'tool'). */
  observation: string;
  /** Thẻ DB thu được (gộp vào kết quả cuối để FE hiển thị + link). */
  cards?: RetrievedCard[];
  /** Lộ trình dựng được (chỉ tool create_itinerary). */
  suggestion?: unknown;
}

/** Schema chung cho 4 tool tìm kiếm DB (trip/place/guide/post). */
function dbSearchParams(extra?: Record<string, unknown>): Record<string, unknown> {
  return {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Cụm từ khoá / điểm đến cần tìm (tiếng Việt có dấu)' },
      category: {
        type: 'string',
        description: 'Loại hình nếu rõ: beach|mountain|food|culture|city|island|adventure|nature|historical',
      },
      browse: {
        type: 'boolean',
        description: 'true nếu chỉ muốn LIỆT KÊ chung (không lọc theo từ khoá), trả top theo đánh giá',
      },
      ...extra,
    },
    required: ['query'],
  };
}

/** Danh sách 6 TOOL đưa cho LLM (schema). Mô tả viết kỹ để LLM chọn đúng. */
export const RAG_TOOL_DEFS: ToolDef[] = [
  {
    name: 'search_trips',
    description:
      'Tìm CHUYẾN ĐI / tour / lịch trình CÓ SẴN trong hệ thống TripMate theo điểm đến, loại hình, ngân sách. Dùng khi user hỏi "có chuyến nào", "tour đi X", "chuyến dưới Y triệu".',
    parameters: dbSearchParams({
      maxBudget: { type: 'number', description: 'Ngân sách trần (VND), vd 3 triệu → 3000000' },
    }),
  },
  {
    name: 'search_places',
    description:
      'Tìm ĐỊA ĐIỂM / điểm tham quan / danh lam trong hệ thống. Dùng khi user hỏi "chỗ nào đẹp ở X", "địa điểm tham quan", "có gì chơi".',
    parameters: dbSearchParams(),
  },
  {
    name: 'search_guides',
    description:
      'Tìm HỒ SƠ hướng dẫn viên (HDV) CỤ THỂ đã duyệt theo khu vực/chuyên môn/ngôn ngữ — trả về DANH SÁCH HDV thật. Dùng khi user muốn TÌM/THUÊ một HDV ("HDV ở Phú Quốc", "có HDV nào dẫn tour Sapa"). KHÔNG dùng cho câu hỏi CÁCH thuê/đặt HDV (đó là hướng dẫn dùng web → search_documents).',
    parameters: dbSearchParams(),
  },
  {
    name: 'search_posts',
    description:
      'Tìm BÀI VIẾT / review / chia sẻ kinh nghiệm của cộng đồng. Dùng khi user hỏi "review", "kinh nghiệm", "bài viết về X".',
    parameters: dbSearchParams(),
  },
  {
    name: 'search_documents',
    description:
      'Tra KIẾN THỨC trong tài liệu: (1) HƯỚNG DẪN SỬ DỤNG WEBSITE TripMate — cách thuê HDV, cách đặt/tạo chuyến, cách nạp ví, đăng ký làm HDV, lưu ý an toàn du lịch; (2) kiến thức điểm đến — mùa đẹp, đặc sản, mô tả 5 tỉnh. LUÔN dùng tool này cho câu hỏi "CÁCH/LÀM SAO/QUY TRÌNH…". Đây là RAG vector thật (embedding + hybrid search).',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Câu truy vấn cho tài liệu (tiếng Việt có dấu)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_itinerary',
    description:
      'DỰNG LỘ TRÌNH du lịch MỚI theo yêu cầu user. CHỈ gọi khi user muốn TẠO/LÊN lộ trình (không phải tìm chuyến có sẵn). Trước khi gọi, nên search_places/search_documents để có dữ liệu thật về điểm đến, rồi truyền vào context.',
    parameters: {
      type: 'object',
      properties: {
        request: { type: 'string', description: 'Yêu cầu nguyên văn của user (điểm đến, số ngày, sở thích…)' },
        context: {
          type: 'string',
          description: 'Tóm tắt thông tin THẬT đã thu thập (địa điểm, đặc sản…) để dựng lộ trình không bịa',
        },
      },
      required: ['request'],
    },
  },
];

/** Tool chỉnh sửa lộ trình nháp — CHỈ nạp khi đang có draft (có reviseItinerary). */
const REVISE_TOOL_DEF: ToolDef = {
  name: 'revise_itinerary',
  description:
    'CHỈNH SỬA lộ trình ĐANG hiển thị theo yêu cầu user (đổi/thêm/bớt ngày, đổi địa điểm, đổi ngân sách, chốt ngày khởi hành…). CHỈ gọi khi user muốn THAY ĐỔI lộ trình hiện có. Nếu user hỏi thông tin khác hoặc muốn lộ trình MỚI hoàn toàn (điểm đến khác) thì ĐỪNG dùng tool này.',
  parameters: {
    type: 'object',
    properties: {
      request: { type: 'string', description: 'Yêu cầu chỉnh sửa nguyên văn của user' },
    },
    required: ['request'],
  },
};

/**
 * Danh sách TOOL đưa cho LLM. `hasDraft=true` (đang có lộ trình nháp) → nạp thêm
 * revise_itinerary để agent tự chọn giữa chỉnh sửa / tạo mới / trả lời câu hỏi.
 */
export function buildToolDefs(hasDraft: boolean): ToolDef[] {
  return hasDraft ? [...RAG_TOOL_DEFS, REVISE_TOOL_DEF] : RAG_TOOL_DEFS;
}

/** Chạy 1 tool theo tên + tham số LLM truyền. Không ném lỗi (trả observation lỗi). */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  deps: ToolDeps,
): Promise<ToolResult> {
  try {
    if (name === 'revise_itinerary') {
      if (!deps.reviseItinerary) {
        return { observation: 'Không có lộ trình nháp để chỉnh sửa.' };
      }
      const request = String(args.request ?? '');
      const updated = await deps.reviseItinerary(request);
      if (!updated) return { observation: 'Chưa chỉnh được lộ trình (lỗi sinh hoặc yêu cầu không rõ).' };
      const s = updated as { title?: string; destination?: string; durationDays?: number };
      return {
        observation: `Đã cập nhật lộ trình "${s.title}" (${s.destination}, ${s.durationDays} ngày) theo yêu cầu.`,
        suggestion: updated,
      };
    }

    if (name === 'create_itinerary') {
      const request = String(args.request ?? '');
      const context = String(args.context ?? '');
      const suggestion = await deps.createItinerary(request, context);
      if (!suggestion) {
        return { observation: 'Chưa dựng được lộ trình (thiếu thông tin điểm đến hoặc lỗi sinh).' };
      }
      const s = suggestion as { title?: string; destination?: string; durationDays?: number };
      return {
        observation: `Đã dựng lộ trình "${s.title}" (${s.destination}, ${s.durationDays} ngày). Lộ trình đã sẵn sàng hiển thị cho user.`,
        suggestion,
      };
    }

    if (name === 'search_documents') {
      const query = String(args.query ?? '');
      const hits = await deps.searchDocuments(query, deps.docTopK);
      if (hits.length === 0) return { observation: 'Không tìm thấy đoạn tài liệu liên quan.' };
      const observation = hits
        .map((h, i) => `[${i + 1}] (${h.docName} #${h.chunkIndex}, cosine ${h.score.toFixed(3)})\n${h.content.slice(0, 500)}`)
        .join('\n\n');
      return { observation };
    }

    // 4 tool DB còn lại → dùng retriever tương ứng.
    const source = TOOL_TO_SOURCE[name];
    if (!source) return { observation: `Tool không tồn tại: ${name}` };
    const retriever = deps.retrievers[source];
    const filters: RetrieverFilters = {
      search: String(args.query ?? ''),
      keywords: [],
      category: args.category ? String(args.category) : undefined,
      maxBudget: typeof args.maxBudget === 'number' ? args.maxBudget : undefined,
      browse: args.browse === true,
    };
    const cards = await retriever.retrieve(filters, deps.dbLimit);
    if (cards.length === 0) {
      return { observation: `Không tìm thấy ${SOURCE_LABEL[source]} nào khớp "${filters.search}".` };
    }
    const observation =
      `Tìm thấy ${cards.length} ${SOURCE_LABEL[source]}:\n` +
      cards.map((c, i) => `${i + 1}. ${c.context}`).join('\n');
    return { observation, cards };
  } catch (err) {
    return { observation: `Lỗi khi chạy tool ${name}: ${(err as Error).message}` };
  }
}

/** Map tên tool DB → nguồn retriever. */
const TOOL_TO_SOURCE: Record<string, Exclude<RagSource, 'doc'>> = {
  search_trips: 'trip',
  search_places: 'place',
  search_guides: 'guide',
  search_posts: 'post',
};

const SOURCE_LABEL: Record<Exclude<RagSource, 'doc'>, string> = {
  trip: 'chuyến đi',
  place: 'địa điểm',
  guide: 'hướng dẫn viên',
  post: 'bài viết',
};
