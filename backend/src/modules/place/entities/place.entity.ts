import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Province } from './province.entity';
import { Category } from './category.entity';
import { PlaceImage } from './place-image.entity';
import { PlaceOpeningHour } from './place-opening-hour.entity';

@Entity('places')
export class Place {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 200 })
  name!: string;

  @Index({ unique: true })
  @Column({ length: 220 })
  slug!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ name: 'long_description', type: 'text', nullable: true })
  longDescription?: string;

  @ManyToOne(() => Category, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category!: Category;

  @Column({ name: 'category_id' })
  categoryId!: string;

  @ManyToOne(() => Province, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'province_id' })
  province!: Province;

  @Column({ name: 'province_id' })
  provinceId!: string;

  @Column({ length: 100, nullable: true })
  city?: string;

  @Column({ length: 300, nullable: true })
  address?: string;

  @Column({ name: 'cover_image', length: 500 })
  coverImage!: string;

  @Column({ type: 'numeric', precision: 3, scale: 2, default: 0 })
  rating!: number;

  @Column({ name: 'review_count', default: 0 })
  reviewCount!: number;

  @Column({ length: 100, nullable: true })
  duration?: string;

  @Column({ name: 'best_time', length: 200, nullable: true })
  bestTime?: string;

  @Column({ name: 'entrance_fee', length: 100, nullable: true })
  entranceFee?: string;

  @Column({ type: 'text', array: true, default: () => "'{}'::text[]" })
  tags!: string[];

  @Column({ type: 'text', array: true, default: () => "'{}'::text[]" })
  highlights!: string[];

  @Column({ type: 'double precision', nullable: true })
  lat?: number;

  @Column({ type: 'double precision', nullable: true })
  lng?: number;

  @OneToMany(() => PlaceImage, (img) => img.place, { cascade: true })
  gallery!: PlaceImage[];

  @OneToMany(() => PlaceOpeningHour, (h) => h.place, { cascade: true })
  openingHours!: PlaceOpeningHour[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
