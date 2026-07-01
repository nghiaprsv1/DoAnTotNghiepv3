import { Fragment } from 'react'

/**
 * RichText — render câu trả lời chatbot dạng Markdown NHẸ, không cần thư viện ngoài.
 * Hỗ trợ:
 *   - **đậm** (inline, nhiều cụm trên một dòng)
 *   - danh sách có số "1. ..." và gạch đầu dòng "- ..." / "* ..."
 *   - tiêu đề "# ", "## ", "### "
 *   - đoạn văn + xuống dòng
 * Mục tiêu: câu trả lời dễ đọc, KHÔNG còn dính chùm hay hiện ký tự ** thô.
 */

/** Tách **đậm** trong một dòng thành các đoạn <strong>. */
function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter((s) => s !== '')
  return parts.map((p, i) => {
    const m = /^\*\*([^*]+)\*\*$/.exec(p)
    if (m) {
      return (
        <strong key={i} className="font-bold text-on-surface">
          {m[1]}
        </strong>
      )
    }
    return <Fragment key={i}>{p}</Fragment>
  })
}

type Block =
  | { type: 'h'; level: number; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; start: number; items: string[] }
  | { type: 'p'; text: string }

/** Gom các dòng thành block (đoạn / danh sách / tiêu đề). */
function parseBlocks(src: string): Block[] {
  // Tiền xử lý: nhiều câu trả lời LLM dùng " - " và " 2. " làm dấu phân tách
  // NGAY TRÊN MỘT DÒNG (không xuống dòng thật) → dính chùm. Chèn newline trước
  // mỗi mục để mỗi nội dung tách dòng riêng.
  const normalized = src
    .replace(/\r\n/g, '\n')
    // " - **Label" hoặc " - text" giữa dòng → xuống dòng thành gạch đầu dòng
    .replace(/\s+-\s+(?=\*\*|[A-ZÀ-Ỹ])/g, '\n- ')
    // " 2. **Mục" giữa dòng (số thứ tự không ở đầu) → xuống dòng
    .replace(/(\S)\s+(\d+[.)]\s+\*\*)/g, '$1\n$2')
    // ": **Label:**" — tách các cặp nhãn bị nối nhau (phòng hờ)
    .replace(/\s+(#{1,3}\s+)/g, '\n$1')

  const lines = normalized.split('\n')
  const blocks: Block[] = []
  let para: string[] = []
  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: 'p', text: para.join(' ') })
      para = []
    }
  }
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      flushPara()
      continue
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line)
    if (h) {
      flushPara()
      blocks.push({ type: 'h', level: h[1].length, text: h[2] })
      continue
    }
    const ol = /^(\d+)[.)]\s+(.*)$/.exec(line)
    if (ol) {
      flushPara()
      const num = Number(ol[1])
      const last = blocks[blocks.length - 1]
      // Gộp vào ol trước NẾU số tiếp nối liền mạch; ngược lại mở ol mới giữ
      // đúng số gốc (start) — tránh mọi mục bị reset về "1.".
      if (last && last.type === 'ol' && num === last.start + last.items.length) {
        last.items.push(ol[2])
      } else {
        blocks.push({ type: 'ol', start: num, items: [ol[2]] })
      }
      continue
    }
    const ul = /^[-*•]\s+(.*)$/.exec(line)
    if (ul) {
      flushPara()
      const last = blocks[blocks.length - 1]
      if (last && last.type === 'ul') last.items.push(ul[1])
      else blocks.push({ type: 'ul', items: [ul[1]] })
      continue
    }
    para.push(line)
  }
  flushPara()
  return blocks
}

export function RichText({ text }: { text: string }) {
  const blocks = parseBlocks(text)
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {blocks.map((b, i) => {
        if (b.type === 'h') {
          const cls =
            b.level === 1
              ? 'font-headline font-extrabold text-base'
              : 'font-headline font-bold text-sm'
          return (
            <p key={i} className={cls}>
              {renderInline(b.text)}
            </p>
          )
        }
        if (b.type === 'ol') {
          return (
            <ol key={i} start={b.start} className="list-decimal pl-5 space-y-1">
              {b.items.map((it, j) => (
                <li key={j}>{renderInline(it)}</li>
              ))}
            </ol>
          )
        }
        if (b.type === 'ul') {
          return (
            <ul key={i} className="list-disc pl-5 space-y-1">
              {b.items.map((it, j) => (
                <li key={j}>{renderInline(it)}</li>
              ))}
            </ul>
          )
        }
        return <p key={i}>{renderInline(b.text)}</p>
      })}
    </div>
  )
}
