import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  Index,
} from 'typeorm';
import { Trip } from './trip.entity';
import { User } from '@/modules/user/entities/user.entity';

export enum TripMemberRole {
  LEADER = 'leader',
  MEMBER = 'member',
  GUIDE = 'guide',
}

@Entity('trip_members')
@Unique(['tripId', 'userId'])
export class TripMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Trip, (t) => t.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip!: Trip;

  @Index()
  @Column({ name: 'trip_id' })
  tripId!: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Index()
  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ type: 'enum', enum: TripMemberRole, default: TripMemberRole.MEMBER })
  role!: TripMemberRole;

  @Column({ length: 500, nullable: true })
  note?: string;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt!: Date;
}
