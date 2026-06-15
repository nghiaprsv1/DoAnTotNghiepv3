/**
 * Rich seed data for the Guide module: ~5 approved guides, ~8 travelers,
 * and ~30 bookings spread across all lifecycle states + 6 months so the
 * dashboard / revenue chart actually have something to render.
 *
 * Idempotent — re-running won't duplicate rows. Safe to run after
 * `npm run seed`.
 *
 * Usage:  cd backend && npm run seed:guides
 */
import 'reflect-metadata'
import * as bcrypt from 'bcrypt'
import dataSource from './datasource'
import { User } from './modules/user/entities/user.entity'
import { UserRole } from './common/enums/user-role.enum'
import {
  GuideProfile,
  GuideStatus,
  GuideAvailability,
} from './modules/guide/entities/guide-profile.entity'
import {
  BookingStatus,
  GuideBooking,
} from './modules/guide/entities/guide-booking.entity'
import { Wallet } from './modules/guide/entities/wallet.entity'
import {
  WalletTransaction,
  WalletTxnStatus,
  WalletTxnType,
} from './modules/guide/entities/wallet-transaction.entity'
import { GUIDE_PERSONAS, TRAVELER_PERSONAS } from './seed-guides.data'
import { TOUR_TITLES, TRAVELER_NOTES } from './seed-guides.types'
import type { BookingPlan, GuidePersona } from './seed-guides.types'

const COMMISSION_RATE = 0.1
const SEED_TAG = '[seed:guides]'

const daysAgo = (n: number): Date => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}
const isoDate = (d: Date) => d.toISOString().slice(0, 10)
const pick = <T>(arr: T[], i: number) => arr[i % arr.length]

async function ensureUser(
  data: { email: string; name: string; handle: string; avatar: string },
  role: UserRole,
): Promise<User> {
  const repo = dataSource.getRepository(User)
  let u = await repo.findOne({ where: { email: data.email } })
  if (u) {
    if (u.role !== role) {
      u.role = role
      u.verified = role === UserRole.GUIDE || role === UserRole.ADMIN
      u = await repo.save(u)
    }
    return u
  }
  return repo.save(
    repo.create({
      ...data,
      role,
      verified: role === UserRole.GUIDE,
      passwordHash: await bcrypt.hash('demo1234', 10),
    }),
  )
}

async function ensureGuideProfile(user: User, persona: GuidePersona) {
  const repo = dataSource.getRepository(GuideProfile)
  const existing = await repo.findOne({ where: { userId: user.id } })
  if (existing) return existing
  return repo.save(
    repo.create({
      userId: user.id,
      region: persona.region,
      regionKeys: persona.regionKeys,
      categoryKeys: persona.categoryKeys,
      languages: persona.languages,
      specialties: persona.specialties,
      bio: persona.bio,
      yearsExperience: persona.yearsExperience,
      pricePerDay: persona.pricePerDay,
      currency: 'VND',
      rating: persona.rating,
      reviewCount: persona.reviewCount,
      toursCompleted: persona.toursCompleted,
      responseTime: persona.responseTime,
      coverImage: persona.coverImage,
      availability: GuideAvailability.AVAILABLE,
      availabilityLabel: persona.availabilityLabel,
      highlights: persona.highlights,
      status: GuideStatus.APPROVED,
    }),
  )
}

async function ensureWallet(userId: string): Promise<Wallet> {
  const repo = dataSource.getRepository(Wallet)
  const w = await repo.findOne({ where: { userId } })
  if (w) return w
  return repo.save(repo.create({ userId, balanceAvailable: 0, balanceFrozen: 0 }))
}

const BOOKING_PLANS: BookingPlan[] = [
  // Recent — pending
  { status: BookingStatus.PENDING_ACCEPTANCE, createdDaysAgo: 0, startDaysAgo: -7, durationDays: 2, groupSize: 2 },
  { status: BookingStatus.PENDING_ACCEPTANCE, createdDaysAgo: 1, startDaysAgo: -10, durationDays: 3, groupSize: 4 },
  { status: BookingStatus.PENDING_ACCEPTANCE, createdDaysAgo: 2, startDaysAgo: -14, durationDays: 1, groupSize: 2 },
  { status: BookingStatus.PENDING_PAYMENT, createdDaysAgo: 3, startDaysAgo: -12, durationDays: 2, groupSize: 3 },
  { status: BookingStatus.PENDING_PAYMENT, createdDaysAgo: 4, startDaysAgo: -20, durationDays: 4, groupSize: 6 },
  // Confirmed — paid, awaiting completion
  { status: BookingStatus.CONFIRMED, createdDaysAgo: 5, startDaysAgo: -15, durationDays: 3, groupSize: 2 },
  { status: BookingStatus.CONFIRMED, createdDaysAgo: 7, startDaysAgo: -8, durationDays: 5, groupSize: 4 },
  { status: BookingStatus.CONFIRMED, createdDaysAgo: 10, startDaysAgo: -5, durationDays: 2, groupSize: 2 },
  { status: BookingStatus.CONFIRMED, createdDaysAgo: 14, startDaysAgo: -3, durationDays: 7, groupSize: 8 },
  // Completed — distributed across 6 months
  { status: BookingStatus.COMPLETED, createdDaysAgo: 20, startDaysAgo: 12, durationDays: 3, groupSize: 4 },
  { status: BookingStatus.COMPLETED, createdDaysAgo: 25, startDaysAgo: 18, durationDays: 2, groupSize: 2 },
  { status: BookingStatus.COMPLETED, createdDaysAgo: 32, startDaysAgo: 25, durationDays: 4, groupSize: 6 },
  { status: BookingStatus.COMPLETED, createdDaysAgo: 40, startDaysAgo: 33, durationDays: 1, groupSize: 2 },
  { status: BookingStatus.COMPLETED, createdDaysAgo: 50, startDaysAgo: 43, durationDays: 5, groupSize: 4 },
  { status: BookingStatus.COMPLETED, createdDaysAgo: 60, startDaysAgo: 53, durationDays: 3, groupSize: 3 },
  { status: BookingStatus.COMPLETED, createdDaysAgo: 70, startDaysAgo: 63, durationDays: 2, groupSize: 2 },
  { status: BookingStatus.COMPLETED, createdDaysAgo: 80, startDaysAgo: 73, durationDays: 7, groupSize: 8 },
  { status: BookingStatus.COMPLETED, createdDaysAgo: 95, startDaysAgo: 88, durationDays: 4, groupSize: 5 },
  { status: BookingStatus.COMPLETED, createdDaysAgo: 105, startDaysAgo: 98, durationDays: 3, groupSize: 4 },
  { status: BookingStatus.COMPLETED, createdDaysAgo: 120, startDaysAgo: 113, durationDays: 2, groupSize: 2 },
  { status: BookingStatus.COMPLETED, createdDaysAgo: 130, startDaysAgo: 123, durationDays: 5, groupSize: 6 },
  { status: BookingStatus.COMPLETED, createdDaysAgo: 145, startDaysAgo: 138, durationDays: 1, groupSize: 2 },
  { status: BookingStatus.COMPLETED, createdDaysAgo: 160, startDaysAgo: 153, durationDays: 3, groupSize: 4 },
  // Cancelled / rejected / expired
  { status: BookingStatus.CANCELLED, createdDaysAgo: 35, startDaysAgo: 28, durationDays: 2, groupSize: 2 },
  { status: BookingStatus.REJECTED, createdDaysAgo: 12, startDaysAgo: 5, durationDays: 1, groupSize: 2 },
  { status: BookingStatus.REJECTED, createdDaysAgo: 65, startDaysAgo: 58, durationDays: 4, groupSize: 6 },
  { status: BookingStatus.EXPIRED, createdDaysAgo: 28, startDaysAgo: 21, durationDays: 2, groupSize: 2 },
]

export {
  COMMISSION_RATE,
  SEED_TAG,
  daysAgo,
  isoDate,
  pick,
  ensureUser,
  ensureGuideProfile,
  ensureWallet,
  BOOKING_PLANS,
}
