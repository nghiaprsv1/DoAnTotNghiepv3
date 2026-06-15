import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Place } from './place.entity';

@Entity('place_opening_hours')
@Unique(['placeId', 'day'])
export class PlaceOpeningHour {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Place, (p) => p.openingHours, { onDelete: 'CASCADE' })
  place!: Place;

  @Column({ name: 'place_id' })
  placeId!: string;

  /** 0 = Sunday, 6 = Saturday */
  @Column({ type: 'smallint' })
  day!: number;

  @Column({ length: 5, nullable: true })
  open?: string;

  @Column({ length: 5, nullable: true })
  close?: string;

  @Column({ default: false })
  closed!: boolean;
}
