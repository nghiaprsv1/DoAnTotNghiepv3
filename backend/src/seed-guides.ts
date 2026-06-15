/**
 * Entry point for the guide-data seeder. Wires personas + booking plans
 * into actual rows. See seed-guides.lib.ts for the helpers.
 *
 * Usage:  cd backend && npm run seed:guides
 */
import 'reflect-metadata'
import dataSource from './datasource'
import { UserRole } from './common/enums/user-role.enum'
import { User } from './modules/user/entities/user.entity'
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
import { Trip } from './modules/trip/entities/trip.entity'
import { TripMember, TripMemberRole } from './modules/trip/entities/trip-member.entity'
import { Category } from './modules/place/entities/category.entity'
import { GUIDE_PERSONAS, TRAVELER_PERSONAS } from './seed-guides.data'
import { TOUR_TITLES, TRAVELER_NOTES } from './seed-guides.types'
import {
  COMMISSION_RATE,
  SEED_TAG,
  BOOKING_PLANS,
  daysAgo,
  isoDate,
  pick,
  ensureUser,
  ensureGuideProfile,
  ensureWallet,
} from './seed-guides.lib'

async function settleCompleted(
  amount: number,
  guideUserId: string,
  bookingId: string,
  completedAt: Date,
) {
  const wallet = await ensureWallet(guideUserId)
  const commission = +(amount * COMMISSION_RATE).toFixed(2)
  const net = +(amount - commission).toFixed(2)
  wallet.balanceAvailable = Number(wallet.balanceAvailable) + net
  await dataSource.getRepository(Wallet).save(wallet)
  const txnRepo = dataSource.getRepository(WalletTransaction)
  await txnRepo.save([
    txnRepo.create({
      walletId: wallet.id,
      type: WalletTxnType.HOLD,
      amount,
      currency: 'VND',
      bookingId,
      note: 'Tour payment held',
      createdAt: completedAt,
    }),
    txnRepo.create({
      walletId: wallet.id,
      type: WalletTxnType.RELEASE,
      amount: net,
      currency: 'VND',
      bookingId,
      note: `Tour completed (${(COMMISSION_RATE * 100).toFixed(0)}% commission applied)`,
      createdAt: completedAt,
    }),
  ])
  // Commission to admin wallet (best-effort)
  const admin = await dataSource.getRepository(User).findOne({ where: { role: UserRole.ADMIN } })
  if (admin) {
    const adminWallet = await ensureWallet(admin.id)
    adminWallet.balanceAvailable = Number(adminWallet.balanceAvailable) + commission
    await dataSource.getRepository(Wallet).save(adminWallet)
    await txnRepo.save(
      txnRepo.create({
        walletId: adminWallet.id,
        type: WalletTxnType.COMMISSION,
        amount: commission,
        currency: 'VND',
        bookingId,
        note: 'Commission income',
        createdAt: completedAt,
      }),
    )
  }
}

async function travelerPay(
  amount: number,
  travelerUserId: string,
  bookingId: string,
  paidAt: Date,
) {
  // Top up the traveler's wallet first (admin gateway), then record the
  // payment debit. Net effect: 0 on the traveler wallet so multiple bookings
  // don't drain balance below zero in seed mode.
  const wallet = await ensureWallet(travelerUserId)
  wallet.balanceAvailable = Number(wallet.balanceAvailable) + amount
  await dataSource.getRepository(Wallet).save(wallet)
  const txnRepo = dataSource.getRepository(WalletTransaction)
  await txnRepo.save([
    txnRepo.create({
      walletId: wallet.id,
      type: WalletTxnType.TOPUP,
      amount,
      currency: 'VND',
      note: 'Seed top-up by admin (preload before booking)',
      createdAt: new Date(paidAt.getTime() - 60_000),
    }),
    txnRepo.create({
      walletId: wallet.id,
      type: WalletTxnType.PAYMENT,
      amount: -amount,
      currency: 'VND',
      bookingId,
      note: 'Booking payment',
      createdAt: paidAt,
    }),
  ])
  wallet.balanceAvailable = Number(wallet.balanceAvailable) - amount
  await dataSource.getRepository(Wallet).save(wallet)
}

async function settleConfirmed(amount: number, guideUserId: string, bookingId: string, paidAt: Date) {
  const wallet = await ensureWallet(guideUserId)
  wallet.balanceFrozen = Number(wallet.balanceFrozen) + amount
  await dataSource.getRepository(Wallet).save(wallet)
  const txnRepo = dataSource.getRepository(WalletTransaction)
  await txnRepo.save(
    txnRepo.create({
      walletId: wallet.id,
      type: WalletTxnType.HOLD,
      amount,
      currency: 'VND',
      bookingId,
      note: 'Tour payment held',
      createdAt: paidAt,
    }),
  )
}

async function run() {
  await dataSource.initialize()
  const bookingRepo = dataSource.getRepository(GuideBooking)

  // Skip if data already seeded.
  const existing = await bookingRepo.count()
  if (existing >= BOOKING_PLANS.length) {
    console.log(`${SEED_TAG} bookings already present (${existing}); skipping.`)
    await dataSource.destroy()
    return
  }

  console.log(`${SEED_TAG} provisioning ${GUIDE_PERSONAS.length} guides + ${TRAVELER_PERSONAS.length} travelers`)
  const guideUsers = await Promise.all(
    GUIDE_PERSONAS.map((p) => ensureUser(p, UserRole.GUIDE)),
  )
  const profiles = await Promise.all(
    GUIDE_PERSONAS.map((p, i) => ensureGuideProfile(guideUsers[i], p)),
  )
  await Promise.all(guideUsers.map((u) => ensureWallet(u.id)))

  const travelers = await Promise.all(
    TRAVELER_PERSONAS.map((p) => ensureUser(p, UserRole.USER)),
  )

  // Make sure each traveler has at least one trip — bookings now must be
  // attached to a trip the traveler is a member of.
  const tripRepo = dataSource.getRepository(Trip)
  const memberRepo = dataSource.getRepository(TripMember)
  const cat = await dataSource.getRepository(Category).findOne({ where: { key: 'culture' } })
  const tripByTraveler = new Map<string, Trip>()
  for (const t of travelers) {
    const existingMembership = await memberRepo.findOne({ where: { userId: t.id } })
    if (existingMembership) {
      const trip = await tripRepo.findOne({ where: { id: existingMembership.tripId } })
      if (trip) {
        tripByTraveler.set(t.id, trip)
        continue
      }
    }
    const trip = await tripRepo.save(
      tripRepo.create({
        title: `Chuyến demo của ${t.name}`,
        description: 'Chuyến đi seed để gắn với booking thuê HDV.',
        destination: 'Việt Nam',
        categoryId: cat?.id,
        coverImage:
          'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80',
        startDate: isoDate(daysAgo(-30)),
        endDate: isoDate(daysAgo(-25)),
        durationDays: 5,
        priceFrom: 0,
        currency: 'VND',
        rating: 0,
        maxMembers: 8,
        memberCount: 1,
        creatorId: t.id,
        tags: ['Demo'],
      }),
    )
    await memberRepo.save(
      memberRepo.create({ tripId: trip.id, userId: t.id, role: TripMemberRole.LEADER }),
    )
    tripByTraveler.set(t.id, trip)
  }

  console.log(`${SEED_TAG} planting ${BOOKING_PLANS.length} bookings…`)
  for (let i = 0; i < BOOKING_PLANS.length; i++) {
    const plan = BOOKING_PLANS[i]
    const guideIdx = i % GUIDE_PERSONAS.length
    const persona = GUIDE_PERSONAS[guideIdx]
    const profile = profiles[guideIdx]
    const guideUser = guideUsers[guideIdx]
    const traveler = pick(travelers, i)
    const startDate = daysAgo(plan.startDaysAgo)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + plan.durationDays - 1)
    const createdAt = daysAgo(plan.createdDaysAgo)
    const titles = TOUR_TITLES[persona.region] ?? [`Tour ${persona.region}`]
    const amount = persona.pricePerDay * plan.durationDays

    const trip = tripByTraveler.get(traveler.id)
    const booking = bookingRepo.create({
      guideId: profile.id,
      travelerId: traveler.id,
      tripId: trip?.id,
      tourTitle: pick(titles, i),
      tourCover: persona.coverImage,
      destination: persona.region,
      startDate: isoDate(startDate),
      endDate: isoDate(endDate),
      durationDays: plan.durationDays,
      groupSize: plan.groupSize,
      amount,
      currency: 'VND',
      message: pick(TRAVELER_NOTES, i),
      status: plan.status as BookingStatus,
      createdAt,
      acceptedAt:
        plan.status !== BookingStatus.PENDING_ACCEPTANCE && plan.status !== BookingStatus.REJECTED
          ? daysAgo(plan.createdDaysAgo - 1)
          : undefined,
      paidAt:
        plan.status === BookingStatus.CONFIRMED ||
        plan.status === BookingStatus.COMPLETED ||
        plan.status === BookingStatus.CANCELLED
          ? daysAgo(plan.createdDaysAgo - 1)
          : undefined,
      completedAt:
        plan.status === BookingStatus.COMPLETED
          ? daysAgo(Math.max(0, plan.startDaysAgo - plan.durationDays))
          : undefined,
    })
    const saved = await bookingRepo.save(booking)

    // Reflect the traveler's payment in their wallet ledger (top-up + debit).
    if (
      plan.status === BookingStatus.CONFIRMED ||
      plan.status === BookingStatus.COMPLETED ||
      plan.status === BookingStatus.CANCELLED
    ) {
      await travelerPay(amount, traveler.id, saved.id, saved.paidAt!)
    }
    if (plan.status === BookingStatus.CONFIRMED) {
      await settleConfirmed(amount, guideUser.id, saved.id, saved.paidAt!)
    } else if (plan.status === BookingStatus.COMPLETED) {
      await settleCompleted(amount, guideUser.id, saved.id, saved.completedAt!)
    }
  }

  // Give every traveler a small spare balance for demo top-ups (~500k each).
  for (const t of travelers) {
    const wallet = await ensureWallet(t.id)
    const txnRepo = dataSource.getRepository(WalletTransaction)
    const existingTopup = await txnRepo.findOne({ where: { walletId: wallet.id, type: WalletTxnType.TOPUP, note: 'Seed welcome top-up' } })
    if (!existingTopup) {
      const amount = 500_000
      wallet.balanceAvailable = Number(wallet.balanceAvailable) + amount
      await dataSource.getRepository(Wallet).save(wallet)
      await txnRepo.save(
        txnRepo.create({
          walletId: wallet.id,
          type: WalletTxnType.TOPUP,
          amount,
          currency: 'VND',
          note: 'Seed welcome top-up',
        }),
      )
    }
  }

  // Add a couple of pending withdrawal requests for the first guide.
  const firstGuide = guideUsers[0]
  const w = await ensureWallet(firstGuide.id)
  if (Number(w.balanceAvailable) >= 1_000_000) {
    const txnRepo = dataSource.getRepository(WalletTransaction)
    const pendingExists = await txnRepo.findOne({
      where: { walletId: w.id, type: WalletTxnType.WITHDRAW_REQUEST, status: WalletTxnStatus.PENDING },
    })
    if (!pendingExists) {
      const amt = 1_000_000
      w.balanceAvailable = Number(w.balanceAvailable) - amt
      await dataSource.getRepository(Wallet).save(w)
      await txnRepo.save(
        txnRepo.create({
          walletId: w.id,
          type: WalletTxnType.WITHDRAW_REQUEST,
          status: WalletTxnStatus.PENDING,
          amount: -amt,
          currency: 'VND',
          bankAccount: 'Vietcombank — 0123456789 — Minh Tran',
          note: 'Withdrawal pending admin review',
        }),
      )
      console.log(`${SEED_TAG} created 1 pending withdrawal request for ${firstGuide.email}`)
    }
  }

  console.log(`${SEED_TAG} ✅ done. Login as a guide with password 'demo1234'`)
  GUIDE_PERSONAS.forEach((p) => console.log(`  · ${p.email}`))
  await dataSource.destroy()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
