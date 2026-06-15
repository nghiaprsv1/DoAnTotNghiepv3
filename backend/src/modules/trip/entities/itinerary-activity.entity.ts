import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ItineraryDay } from './itinerary-day.entity';

@Entity('itinerary_activities')
export class ItineraryActivity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => ItineraryDay, (d) => d.activities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'day_id' })
  day!: ItineraryDay;

  @Column({ name: 'day_id' })
  dayId!: string;

  /** "09:00" */
  @Column({ length: 5 })
  time!: string;

  @Column({ length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', array: true, default: () => "'{}'::text[]" })
  images!: string[];

  @Column({ name: 'sort_order', default: 0 })
  sortOrder!: number;
}
