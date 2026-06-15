import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { Place } from './place.entity';

@Entity('place_images')
export class PlaceImage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Place, (p) => p.gallery, { onDelete: 'CASCADE' })
  place!: Place;

  @Index()
  @Column({ name: 'place_id' })
  placeId!: string;

  @Column({ length: 500 })
  url!: string;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder!: number;
}
