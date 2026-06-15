import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Trip } from './trip.entity';
import { ItineraryActivity } from './itinerary-activity.entity';

@Entity('itinerary_days')
@Unique(['tripId', 'dayNumber'])
export class ItineraryDay {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Trip, (t) => t.itinerary, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip!: Trip;

  @Column({ name: 'trip_id' })
  tripId!: string;

  @Column({ name: 'day_number' })
  dayNumber!: number;

  @Column({ type: 'date' })
  date!: string;

  @Column({ length: 200 })
  title!: string;

  @OneToMany(() => ItineraryActivity, (a) => a.day, { cascade: true })
  activities!: ItineraryActivity[];
}
