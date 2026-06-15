import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Category of a Place (also reused for Trip category).
 * Mirror FE `PlaceCategory` from src/types/place.ts.
 */
@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Stable key — beach, mountain, culture, food, city, island, nature, historical, adventure */
  @Index({ unique: true })
  @Column({ length: 50 })
  key!: string;

  @Column({ length: 100 })
  label!: string;

  @Column({ length: 50, nullable: true })
  icon?: string;

  /** True if also offered as Trip category. */
  @Column({ name: 'for_trip', default: true })
  forTrip!: boolean;
}
