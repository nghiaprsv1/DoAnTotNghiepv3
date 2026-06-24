/**
 * Seed 20 CURATED trips — meaningful titles, realistic day-by-day itineraries,
 * and a distinct cover image per trip. Unlike `seed-trips.ts` (random bulk),
 * this is hand-written content for a livelier explore page.
 *
 * Idempotent: skips any trip whose exact title already exists, so it's safe to
 * re-run and it won't clash with the random seeder. Run: `npm run seed:curated`.
 */
import 'reflect-metadata';
import dataSource from './datasource';
import { User } from './modules/user/entities/user.entity';
import { Category } from './modules/place/entities/category.entity';
import { Trip, TripStatus } from './modules/trip/entities/trip.entity';
import {
  TripMember,
  TripMemberRole,
} from './modules/trip/entities/trip-member.entity';
import { ItineraryDay } from './modules/trip/entities/itinerary-day.entity';
import { ItineraryActivity } from './modules/trip/entities/itinerary-activity.entity';

/** One activity row in a day: [time, title, description]. */
type Act = [string, string, string];
/** One day: title + list of activities. */
interface DaySpec {
  title: string;
  acts: Act[];
}
interface TripSpec {
  title: string;
  destination: string;
  categoryKey: string;
  durationDays: number;
  priceFrom: number; // VND
  maxMembers: number;
  rating: number;
  tags: string[];
  description: string;
  /** Distinct Unsplash photo id used as the cover. */
  coverId: string;
  /** Gallery photo ids. */
  galleryIds: string[];
  inclusions: { accommodation: string; transport: string; meals: string };
  itinerary: DaySpec[];
}

const img = (id: string, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

// Spread start dates so the explore page isn't all clustered on one date.
const pad = (n: number) => n.toString().padStart(2, '0');
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, days: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};

// PLACEHOLDER_TRIPS

// PLACEHOLDER_RUN
