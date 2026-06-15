import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** Tỉnh/thành — used for filtering Places & Trips. */
@Entity('provinces')
export class Province {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ length: 100 })
  name!: string;

  /** ASCII slug — e.g. 'ha-noi' */
  @Index({ unique: true })
  @Column({ length: 100 })
  slug!: string;

  /** Region: north | central | south */
  @Column({ length: 20, nullable: true })
  region?: string;

  /* ─────────── Kho kiến thức du lịch (cho trợ lý AI tra cứu) ─────────── */

  /** Giới thiệu ngắn 2-4 câu về tỉnh. */
  @Column({ type: 'text', nullable: true })
  summary?: string | null;

  /** Mùa/thời điểm đẹp để đi, vd "Tháng 3-8 (mùa khô)". */
  @Column({ name: 'best_season', type: 'varchar', length: 200, nullable: true })
  bestSeason?: string | null;

  /** Đặc sản/ẩm thực nổi bật. */
  @Column({ type: 'text', array: true, default: () => "'{}'::text[]" })
  specialties!: string[];

  /** Điểm đến/trải nghiệm nổi bật. */
  @Column({ type: 'text', array: true, default: () => "'{}'::text[]" })
  highlights!: string[];

  /** Nổi tiếng vì (1 câu định vị), vd "Thành phố biển, đảo ngọc". */
  @Column({ name: 'known_for', type: 'varchar', length: 300, nullable: true })
  knownFor?: string | null;
}
