import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Một mẩu (chunk) kiến thức trong vector store của RAG v2.
 *
 * Mỗi tài liệu trong documemtRAG/ được tách thành nhiều chunk; mỗi chunk được
 * Gemini embedding thành một vector và lưu ở cột `embedding` (jsonb number[]).
 * Khi hỏi, ta embed câu hỏi rồi so cosine với toàn bộ chunk để lấy top-K.
 *
 * Lưu embedding dạng jsonb thay vì kiểu vector của pgvector → không cần cài
 * extension, chạy ngay trên Postgres hiện có (phù hợp quy mô đồ án).
 */
@Entity('rag_knowledge_chunks')
export class KnowledgeChunk {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Tên tài liệu nguồn (vd: HuongDanSuDung_LuuYDuLich.txt). */
  @Index()
  @Column({ name: 'doc_name', type: 'varchar', length: 255 })
  docName!: string;

  /** Thứ tự chunk trong tài liệu (0-based). */
  @Column({ name: 'chunk_index', type: 'int' })
  chunkIndex!: number;

  /** Nội dung văn bản của chunk. */
  @Column({ type: 'text' })
  content!: string;

  /** Số ký tự của chunk (tiện hiển thị thống kê pipeline). */
  @Column({ name: 'char_count', type: 'int', default: 0 })
  charCount!: number;

  /** Tên model embedding đã dùng (vd text-embedding-004). */
  @Column({ name: 'embedding_model', type: 'varchar', length: 100, default: '' })
  embeddingModel!: string;

  /** Vector embedding (mảng số thực) lưu dạng jsonb. */
  @Column({ type: 'jsonb' })
  embedding!: number[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
