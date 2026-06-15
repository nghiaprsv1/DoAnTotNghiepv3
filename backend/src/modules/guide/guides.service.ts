import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, EntityManager, Repository } from 'typeorm';
import { GuideProfile, GuideStatus } from './entities/guide-profile.entity';
import { BookingStatus, GuideBooking } from './entities/guide-booking.entity';
import { Wallet } from './entities/wallet.entity';
import {
  WalletTransaction,
  WalletTxnStatus,
  WalletTxnType,
} from './entities/wallet-transaction.entity';
import { User } from '@/modules/user/entities/user.entity';
import { Trip } from '@/modules/trip/entities/trip.entity';
import { TripMember, TripMemberRole } from '@/modules/trip/entities/trip-member.entity';
import { Review, ReviewTargetType } from '@/modules/review/entities/review.entity';
import { UserRole } from '@/common/enums/user-role.enum';
import {
  CreateBookingDto,
  GuideApplyDto,
  QueryGuidesDto,
  RespondBookingDto,
  WithdrawDto,
  WithdrawDecisionDto,
} from './dto/guide.dto';
import { PaginatedResponse } from '@/common/types/api-response.type';
import { NotificationsService } from '@/modules/notification/notifications.service';
import { NotificationType } from '@/modules/notification/entities/notification.entity';
import { SavedService } from '@/modules/saved/saved.service';

const COMMISSION_RATE = 0.1;
/** Hours between guide ACCEPT and traveler PAYMENT before booking expires. */
const PAYMENT_DEADLINE_HOURS = 24;
/** Hours before start_date — late-cancel boundary applied to traveler. */
const LATE_CANCEL_HOURS = 48;
const TRAVELER_LATE_PENALTY_RATE = 0.2;

@Injectable()
export class GuidesService {
  constructor(
    @InjectRepository(GuideProfile) private readonly profiles: Repository<GuideProfile>,
    @InjectRepository(GuideBooking) private readonly bookings: Repository<GuideBooking>,
    @InjectRepository(Wallet) private readonly wallets: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly txns: Repository<WalletTransaction>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Trip) private readonly trips: Repository<Trip>,
    @InjectRepository(TripMember) private readonly tripMembers: Repository<TripMember>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
    @Inject(forwardRef(() => SavedService))
    private readonly saved: SavedService,
  ) {}

  /**
   * Live aggregate stats per guide profile, sourced from real reviews and
   * bookings rather than the denormalized columns on `guide_profiles` (those
   * are kept for legacy seed data but never updated by user activity).
   *
   * - rating / reviewCount: top-level reviews of type GUIDE on this profile id.
   * - toursCompleted: bookings that finished (state COMPLETED).
   * - responseTimeText: median latency between booking creation and the guide
   *   accepting it, formatted as a Vietnamese label. `null` when the guide has
   *   never accepted a booking.
   */
  async loadStats(guideProfileIds: string[]): Promise<
    Map<
      string,
      {
        rating: number;
        reviewCount: number;
        toursCompleted: number;
        responseTimeText: string | null;
      }
    >
  > {
    const stats = new Map<
      string,
      { rating: number; reviewCount: number; toursCompleted: number; responseTimeText: string | null }
    >();
    if (guideProfileIds.length === 0) return stats;

    // Reviews — group rating / count per target_id (= guide profile id).
    const reviewRows: Array<{
      target_id: string;
      avg: string | null;
      cnt: string;
    }> = await this.reviews
      .createQueryBuilder('r')
      .select('r.target_id', 'target_id')
      .addSelect('AVG(r.rating)', 'avg')
      .addSelect('COUNT(*)', 'cnt')
      .where('r.target_type = :t', { t: ReviewTargetType.GUIDE })
      .andWhere('r.target_id IN (:...ids)', { ids: guideProfileIds })
      .andWhere('r.parent_id IS NULL')
      .andWhere('r.rating > 0')
      .groupBy('r.target_id')
      .getRawMany();

    // Tours completed — count of finished bookings per guide.
    const tourRows: Array<{ guide_id: string; cnt: string }> = await this.bookings
      .createQueryBuilder('b')
      .select('b.guide_id', 'guide_id')
      .addSelect('COUNT(*)', 'cnt')
      .where('b.guide_id IN (:...ids)', { ids: guideProfileIds })
      .andWhere('b.status = :s', { s: BookingStatus.COMPLETED })
      .groupBy('b.guide_id')
      .getRawMany();

    // Response latency — median seconds between created_at and accepted_at on
    // bookings the guide actually accepted (i.e. moved past PENDING_ACCEPTANCE).
    const respRows: Array<{ guide_id: string; median_secs: string | null }> = await this.bookings
      .createQueryBuilder('b')
      .select('b.guide_id', 'guide_id')
      .addSelect(
        'PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (b.accepted_at - b.created_at)))',
        'median_secs',
      )
      .where('b.guide_id IN (:...ids)', { ids: guideProfileIds })
      .andWhere('b.accepted_at IS NOT NULL')
      .groupBy('b.guide_id')
      .getRawMany();

    const reviewMap = new Map(
      reviewRows.map((r) => [r.target_id, { avg: Number(r.avg ?? 0), cnt: Number(r.cnt) }]),
    );
    const tourMap = new Map(tourRows.map((r) => [r.guide_id, Number(r.cnt)]));
    const respMap = new Map(
      respRows.map((r) => [r.guide_id, r.median_secs == null ? null : Number(r.median_secs)]),
    );

    for (const id of guideProfileIds) {
      const rev = reviewMap.get(id);
      stats.set(id, {
        rating: rev ? Math.round(rev.avg * 10) / 10 : 0,
        reviewCount: rev?.cnt ?? 0,
        toursCompleted: tourMap.get(id) ?? 0,
        responseTimeText: this.formatResponseTime(respMap.get(id) ?? null),
      });
    }
    return stats;
  }

  /** "trong 30 phút" / "trong 2 giờ" / "trong 1 ngày" — friendly Vietnamese label. */
  private formatResponseTime(seconds: number | null): string | null {
    if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null;
    const mins = seconds / 60;
    if (mins < 60) return `trong ${Math.max(1, Math.round(mins))} phút`;
    const hours = mins / 60;
    if (hours < 24) return `trong ${Math.max(1, Math.round(hours))} giờ`;
    const days = hours / 24;
    return `trong ${Math.max(1, Math.round(days))} ngày`;
  }

  /** Merge live stats onto a guide profile entity (mutates a copy). */
  decorateWithStats(
    g: GuideProfile,
    s: {
      rating: number;
      reviewCount: number;
      toursCompleted: number;
      responseTimeText: string | null;
    },
  ): GuideProfile {
    return Object.assign({}, g, {
      rating: s.rating,
      reviewCount: s.reviewCount,
      toursCompleted: s.toursCompleted,
      // Keep the existing field name so the FE adapter doesn't change.
      responseTime: s.responseTimeText ?? g.responseTime,
    }) as GuideProfile;
  }

  /**
   * Decorate a set of guide profiles with live stats (rating, reviews, tours,
   * response time). Used by other modules (e.g. Saved) that load guide rows
   * directly but still need the same computed numbers the listing shows.
   */
  async attachStatsToGuides(guides: GuideProfile[]): Promise<GuideProfile[]> {
    if (guides.length === 0) return guides;
    const statsMap = await this.loadStats(guides.map((g) => g.id));
    return guides.map((g) => {
      const s = statsMap.get(g.id);
      return s ? this.decorateWithStats(g, s) : g;
    });
  }

  async list(q: QueryGuidesDto, viewerId?: string): Promise<PaginatedResponse<GuideProfile>> {    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const qb = this.profiles
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.user', 'u')
      .where('g.status = :st', { st: GuideStatus.APPROVED });
    if (q.region) qb.andWhere(':r = ANY(g.regionKeys)', { r: q.region });
    if (q.category) qb.andWhere(':c = ANY(g.categoryKeys)', { c: q.category });
    if (q.availability) qb.andWhere('g.availability = :a', { a: q.availability });
    if (q.language) qb.andWhere(':l = ANY(g.languages)', { l: q.language });
    if (q.minPrice != null) qb.andWhere('g.pricePerDay >= :min', { min: q.minPrice });
    if (q.maxPrice != null) qb.andWhere('g.pricePerDay <= :max', { max: q.maxPrice });
    // Availability window: exclude guides who already have an active booking that
    // overlaps [availableFrom, availableTo]. Overlap = booking.start <= to AND
    // booking.end >= from. Active = pending acceptance / pending payment / confirmed.
    if (q.availableFrom && q.availableTo) {
      qb.andWhere(
        `NOT EXISTS (
          SELECT 1 FROM guide_bookings gb
          WHERE gb.guide_id = g.id
            AND gb.status IN (:...activeStatuses)
            AND gb.start_date <= :availTo
            AND COALESCE(gb.end_date, gb.start_date) >= :availFrom
        )`,
        {
          activeStatuses: [
            BookingStatus.PENDING_ACCEPTANCE,
            BookingStatus.PENDING_PAYMENT,
            BookingStatus.CONFIRMED,
          ],
          availFrom: q.availableFrom,
          availTo: q.availableTo,
        },
      );
    }
    if (q.search) {
      qb.andWhere(
        new Brackets((b) =>
          b
            .where('u.name ILIKE :kw', { kw: `%${q.search}%` })
            .orWhere('g.region ILIKE :kw', { kw: `%${q.search}%` }),
        ),
      );
    }
    qb.orderBy('g.rating', 'DESC');
    const [data, total] = await qb.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    const ids = data.map((g) => g.id);
    const [savedSet, statsMap] = await Promise.all([
      this.saved.lookupSet(viewerId ?? '', 'guide', ids),
      this.loadStats(ids),
    ]);
    const decorated = data.map((g) => {
      const stats = statsMap.get(g.id);
      const withStats = stats ? this.decorateWithStats(g, stats) : g;
      return { ...withStats, isSaved: savedSet.has(g.id) } as GuideProfile;
    });
    return { data: decorated, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async detail(id: string, viewerId?: string): Promise<GuideProfile> {
    const g = await this.profiles.findOne({
      where: { id, status: GuideStatus.APPROVED },
      relations: ['user'],
    });
    if (!g) throw new NotFoundException('Guide not found');
    const statsMap = await this.loadStats([id]);
    const stats = statsMap.get(id);
    const decorated = stats ? this.decorateWithStats(g, stats) : g;
    if (viewerId) {
      const set = await this.saved.lookupSet(viewerId, 'guide', [id]);
      (decorated as GuideProfile & { isSaved?: boolean }).isSaved = set.has(id);
    }
    return decorated;
  }

  async apply(userId: string, dto: GuideApplyDto): Promise<GuideProfile> {
    const existing = await this.profiles.findOne({ where: { userId } });
    if (existing && existing.status !== GuideStatus.REJECTED) {
      throw new BadRequestException('Application already submitted');
    }
    const profile = existing
      ? Object.assign(existing, dto, { status: GuideStatus.PENDING })
      : this.profiles.create({ ...dto, userId, status: GuideStatus.PENDING });
    return this.profiles.save(profile);
  }

  /** Admin only — approve / reject application. Spec §1.2. */
  async review(
    profileId: string,
    accept: boolean,
    reason?: string,
  ): Promise<GuideProfile> {
    const profile = await this.profiles.findOne({ where: { id: profileId } });
    if (!profile) throw new NotFoundException('Application not found');
    profile.status = accept ? GuideStatus.APPROVED : GuideStatus.REJECTED;
    profile.rejectReason = accept ? undefined : reason;
    await this.profiles.save(profile);
    if (accept) {
      await this.users.update({ id: profile.userId }, { role: UserRole.GUIDE, verified: true });
      // Initialize a wallet for the new guide if one doesn't exist yet.
      const w = await this.wallets.findOne({ where: { userId: profile.userId } });
      if (!w) {
        await this.wallets.save(
          this.wallets.create({ userId: profile.userId, balanceAvailable: 0, balanceFrozen: 0 }),
        );
      }
      void this.notifications
        .push({
          userId: profile.userId,
          type: NotificationType.GUIDE_APPLICATION,
          title: 'Hồ sơ Hướng dẫn viên đã được duyệt',
          preview: 'Bạn có thể bắt đầu nhận booking ngay bây giờ.',
        })
        .catch(() => undefined);
    } else {
      void this.notifications
        .push({
          userId: profile.userId,
          type: NotificationType.GUIDE_APPLICATION,
          title: 'Hồ sơ Hướng dẫn viên bị từ chối',
          preview: reason ?? 'Vui lòng kiểm tra hồ sơ và nộp lại.',
        })
        .catch(() => undefined);
    }
    return profile;
  }

  /**
   * Return guide's "busy" date ranges — bookings that are pending acceptance,
   * pending payment, or confirmed. The FE date picker uses these to disable
   * dates the guide is unavailable. Cancelled / rejected / expired / completed
   * are excluded.
   */
  async busyDates(guideId: string): Promise<Array<{ startDate: string; endDate: string }>> {
    const ACTIVE_STATUSES = [
      BookingStatus.PENDING_ACCEPTANCE,
      BookingStatus.PENDING_PAYMENT,
      BookingStatus.CONFIRMED,
    ];
    const rows = await this.bookings
      .createQueryBuilder('b')
      .select(['b.startDate AS "startDate"', 'b.endDate AS "endDate"'])
      .where('b.guide_id = :gid', { gid: guideId })
      .andWhere('b.status IN (:...st)', { st: ACTIVE_STATUSES })
      .getRawMany<{ startDate: string; endDate: string | null }>();
    return rows.map((r) => ({
      startDate: String(r.startDate),
      endDate: String(r.endDate ?? r.startDate),
    }));
  }

  async createBooking(travelerId: string, dto: CreateBookingDto): Promise<GuideBooking> {
    const guide = await this.profiles.findOne({ where: { id: dto.guideId } });
    if (!guide || guide.status !== GuideStatus.APPROVED) {
      throw new BadRequestException('Guide not available');
    }
    if (guide.userId === travelerId) {
      throw new BadRequestException('Cannot book yourself');
    }
    // Spec: traveler must attach the booking to one of their own active trips.
    if (!dto.tripId) {
      throw new BadRequestException('Vui lòng chọn chuyến đi để gắn booking');
    }
    const membership = await this.tripMembers.findOne({
      where: { tripId: dto.tripId, userId: travelerId },
    });
    if (!membership) {
      throw new BadRequestException(
        'Bạn không phải thành viên của chuyến đi này, không thể gắn booking',
      );
    }
    const trip = await this.trips.findOne({ where: { id: dto.tripId } });
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }
    // Spec: booking range must be inside the trip range (inclusive). Compare
    // by date string to avoid timezone drift — Trip.startDate / endDate are
    // stored as `date` (no time component).
    const tripStart = String(trip.startDate);
    const tripEnd = String(trip.endDate);
    const bookingStart = dto.startDate;
    const bookingEnd = dto.endDate ?? dto.startDate;
    if (bookingStart < tripStart || bookingEnd > tripEnd) {
      throw new BadRequestException(
        `Ngày thuê HDV phải nằm trong khoảng chuyến đi (${tripStart} → ${tripEnd}).`,
      );
    }
    if (bookingStart > bookingEnd) {
      throw new BadRequestException('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc');
    }

    // Conflict check — refuse if the guide already has an active booking
    // overlapping the requested range. Two ranges [a,b] and [c,d] overlap iff
    // a <= d AND c <= b.
    const ACTIVE_STATUSES = [
      BookingStatus.PENDING_ACCEPTANCE,
      BookingStatus.PENDING_PAYMENT,
      BookingStatus.CONFIRMED,
    ];
    const conflict = await this.bookings
      .createQueryBuilder('b')
      .where('b.guide_id = :gid', { gid: dto.guideId })
      .andWhere('b.status IN (:...st)', { st: ACTIVE_STATUSES })
      .andWhere(
        new Brackets((qb) =>
          qb.where('b.start_date <= :be', { be: bookingEnd }).andWhere(
            new Brackets((qb2) =>
              qb2
                .where('b.end_date IS NULL AND b.start_date >= :bs', {
                  bs: bookingStart,
                })
                .orWhere('b.end_date >= :bs', { bs: bookingStart }),
            ),
          ),
        ),
      )
      .getOne();
    if (conflict) {
      throw new BadRequestException(
        'Hướng dẫn viên đã có lịch bận trong khoảng ngày bạn chọn. Vui lòng chọn ngày khác.',
      );
    }

    const saved = await this.bookings.save(
      this.bookings.create({
        ...dto,
        travelerId,
        status: BookingStatus.PENDING_ACCEPTANCE,
      }),
    );
    void this.notifications
      .push({
        userId: guide.userId,
        actorId: travelerId,
        type: NotificationType.BOOKING_NEW,
        title: 'Bạn có yêu cầu đặt tour mới',
        preview: `${dto.tourTitle} · gắn với chuyến "${trip.title}"`,
        ctaLabel: 'Xem chi tiết',
        ctaHref: `/bookings/${saved.id}`,
        image: dto.tourCover,
      })
      .catch(() => undefined);
    return saved;
  }

  /** Booking state machine. Spec Phần 2. */
  async respondBooking(
    bookingId: string,
    actorId: string,
    dto: RespondBookingDto,
  ): Promise<GuideBooking> {
    return this.dataSource.transaction(async (m) => {
      const booking = await m.getRepository(GuideBooking).findOne({
        where: { id: bookingId },
        relations: ['guide', 'guide.user'],
      });
      if (!booking) throw new NotFoundException('Booking not found');
      const guideUserId = booking.guide.userId;
      const isGuide = guideUserId === actorId;
      const isTraveler = booking.travelerId === actorId;

      switch (dto.action) {
        case 'accept': {
          if (!isGuide) throw new ForbiddenException();
          if (booking.status !== BookingStatus.PENDING_ACCEPTANCE) {
            throw new BadRequestException('Only pending bookings can be accepted');
          }
          booking.status = BookingStatus.PENDING_PAYMENT;
          booking.acceptedAt = new Date();
          break;
        }
        case 'reject': {
          if (!isGuide) throw new ForbiddenException();
          booking.status = BookingStatus.REJECTED;
          booking.cancelReason = dto.reason;
          break;
        }
        case 'pay': {
          if (!isTraveler) throw new ForbiddenException();
          if (booking.status !== BookingStatus.PENDING_PAYMENT) {
            throw new BadRequestException('Booking is not awaiting payment');
          }
          // Auto-expire if past deadline.
          if (
            booking.acceptedAt &&
            Date.now() - booking.acceptedAt.getTime() > PAYMENT_DEADLINE_HOURS * 3600_000
          ) {
            booking.status = BookingStatus.EXPIRED;
            await m.getRepository(GuideBooking).save(booking);
            throw new BadRequestException('Payment deadline expired');
          }
          // Debit traveler wallet, then mirror as HOLD on guide wallet. Both
          // halves are part of the same transaction so the books always balance.
          await this.debitTraveler(
            m,
            booking.travelerId,
            Number(booking.amount),
            booking.currency,
            booking.id,
          );
          booking.status = BookingStatus.CONFIRMED;
          booking.paidAt = new Date();
          await this.creditFrozen(m, guideUserId, Number(booking.amount), booking.currency, booking.id);
          // Spec: payment xác nhận → gắn HDV vào chuyến đi.
          if (booking.tripId) {
            await this.attachGuideToTrip(m, booking.tripId, guideUserId);
          }
          break;
        }
        case 'cancel': {
          if (!isGuide && !isTraveler) throw new ForbiddenException();
          await this.handleCancel(m, booking, isGuide);
          booking.status = BookingStatus.CANCELLED;
          booking.cancelReason = dto.reason;
          break;
        }
        case 'complete': {
          // Spec: only the traveler (the booking owner) confirms completion.
          // The guide cannot self-complete to claim funds.
          if (!isTraveler) throw new ForbiddenException();
          if (booking.status !== BookingStatus.CONFIRMED) {
            throw new BadRequestException('Only confirmed bookings can be completed');
          }
          booking.status = BookingStatus.COMPLETED;
          booking.completedAt = new Date();
          await this.settleCommission(m, guideUserId, Number(booking.amount), booking.currency, booking.id);
          break;
        }
        default:
          throw new BadRequestException('Unknown action');
      }
      const updated = await m.getRepository(GuideBooking).save(booking);
      // Best-effort lifecycle notifications outside the transaction context —
      // failures shouldn't roll back the booking save.
      void this.notifyLifecycle(updated, dto.action, isGuide).catch(() => undefined);
      return updated;
    });
  }

  /** Push notifications to the *other party* on each lifecycle transition. */
  private async notifyLifecycle(
    booking: GuideBooking,
    action: string,
    actorIsGuide: boolean,
  ) {
    const map: Record<string, { to: 'traveler' | 'guide'; title: string; preview: string }> = {
      accept: { to: 'traveler', title: 'HDV đã chấp nhận yêu cầu', preview: 'Hãy thanh toán trong 24h để giữ lịch.' },
      reject: { to: 'traveler', title: 'HDV đã từ chối yêu cầu', preview: booking.cancelReason ?? 'Vui lòng thử HDV khác.' },
      pay: { to: 'guide', title: 'Khách đã thanh toán tour', preview: 'Tiền đã vào ví đóng băng, sẵn sàng cho chuyến đi.' },
      cancel: {
        to: actorIsGuide ? 'traveler' : 'guide',
        title: actorIsGuide ? 'HDV đã huỷ chuyến' : 'Khách đã huỷ chuyến',
        preview: booking.cancelReason ?? 'Xem chi tiết để biết hoàn tiền.',
      },
      complete: { to: 'guide', title: 'Khách đã xác nhận hoàn thành', preview: '90% tour đã giải ngân vào ví khả dụng.' },
    };
    const evt = map[action];
    if (!evt) return;
    const userId = evt.to === 'traveler' ? booking.travelerId : booking.guide.userId;
    await this.notifications.push({
      userId,
      type: NotificationType.BOOKING_NEW,
      title: evt.title,
      preview: evt.preview,
      ctaLabel: 'Xem chi tiết',
      ctaHref: `/bookings/${booking.id}`,
      image: booking.tourCover,
    });
  }

  listMyBookingsAsTraveler(userId: string) {
    // Traveler view: surface the guide profile + the user behind it so the FE
    // can render the guide's avatar / name without a second round-trip.
    return this.bookings.find({
      where: { travelerId: userId },
      relations: ['guide', 'guide.user', 'traveler'],
      order: { createdAt: 'DESC' },
    });
  }

  async listMyBookingsAsGuide(userId: string) {
    const profile = await this.profiles.findOne({ where: { userId } });
    if (!profile) return [];
    // Guide view: surface the traveler so we can show "Khách: Nguyễn Văn A" etc.
    return this.bookings.find({
      where: { guideId: profile.id },
      relations: ['guide', 'guide.user', 'traveler'],
      order: { createdAt: 'DESC' },
    });
  }

  /* ────────────────────────── Trip linkage ────────────────────────── */

  /**
   * Promote a guide into a trip after the traveler pays for the booking.
   *  - Sets `trips.guide_id` so the trip detail page can show the guide panel.
   *  - Ensures a `trip_members` row with role=GUIDE exists for that user. If
   *    the guide was already a regular member, upgrade their role; otherwise
   *    insert a new row and bump `member_count`.
   */
  private async attachGuideToTrip(
    m: EntityManager,
    tripId: string,
    guideUserId: string,
  ): Promise<void> {
    const tripRepo = m.getRepository(Trip);
    const memberRepo = m.getRepository(TripMember);

    const trip = await tripRepo.findOne({ where: { id: tripId } });
    if (!trip) return;
    if (trip.guideId !== guideUserId) {
      trip.guideId = guideUserId;
      await tripRepo.save(trip);
    }

    const existing = await memberRepo.findOne({ where: { tripId, userId: guideUserId } });
    if (existing) {
      if (existing.role !== TripMemberRole.GUIDE) {
        existing.role = TripMemberRole.GUIDE;
        await memberRepo.save(existing);
      }
      return;
    }

    await memberRepo.save(
      memberRepo.create({
        tripId,
        userId: guideUserId,
        role: TripMemberRole.GUIDE,
      }),
    );
    await tripRepo.increment({ id: tripId }, 'memberCount', 1);
  }

  /* ────────────────────────── Wallet helpers ────────────────────────── */

  /** Credit the booking amount into the guide's frozen balance on payment. */
  private async creditFrozen(
    m: EntityManager,
    guideUserId: string,
    amount: number,
    currency: string,
    bookingId: string,
  ) {
    const w = await this.ensureWallet(m, guideUserId);
    w.balanceFrozen = Number(w.balanceFrozen) + amount;
    await m.getRepository(Wallet).save(w);
    await m.getRepository(WalletTransaction).save(
      m.getRepository(WalletTransaction).create({
        walletId: w.id,
        type: WalletTxnType.HOLD,
        amount,
        currency,
        bookingId,
        note: 'Tour payment held',
      }),
    );
  }

  /** Settle a completed booking: 10% commission + 90% to guide available. */
  private async settleCommission(
    m: EntityManager,
    guideUserId: string,
    amount: number,
    currency: string,
    bookingId: string,
  ) {
    const guideWallet = await this.ensureWallet(m, guideUserId);
    const commission = +(amount * COMMISSION_RATE).toFixed(2);
    const net = +(amount - commission).toFixed(2);

    guideWallet.balanceFrozen = Math.max(0, Number(guideWallet.balanceFrozen) - amount);
    guideWallet.balanceAvailable = Number(guideWallet.balanceAvailable) + net;
    await m.getRepository(Wallet).save(guideWallet);
    await m.getRepository(WalletTransaction).save([
      m.getRepository(WalletTransaction).create({
        walletId: guideWallet.id,
        type: WalletTxnType.RELEASE,
        amount: net,
        currency,
        bookingId,
        note: `Tour completed (${(COMMISSION_RATE * 100).toFixed(0)}% commission applied)`,
      }),
    ]);

    // Track commission against the platform admin wallet (best-effort).
    const adminUser = await m.getRepository(User).findOne({ where: { role: UserRole.ADMIN } });
    if (adminUser) {
      const adminWallet = await this.ensureWallet(m, adminUser.id);
      adminWallet.balanceAvailable = Number(adminWallet.balanceAvailable) + commission;
      await m.getRepository(Wallet).save(adminWallet);
      await m.getRepository(WalletTransaction).save(
        m.getRepository(WalletTransaction).create({
          walletId: adminWallet.id,
          type: WalletTxnType.COMMISSION,
          amount: commission,
          currency,
          bookingId,
          note: 'Commission income',
        }),
      );
    }
  }

  /**
   * Cancel a confirmed booking — applies the refund/penalty rules and credits
   * the traveler's wallet for the refundable portion (since payment now debits
   * their wallet directly). If booking isn't confirmed yet, no money has moved.
   */
  private async handleCancel(
    m: EntityManager,
    booking: GuideBooking,
    byGuide: boolean,
  ) {
    if (booking.status !== BookingStatus.CONFIRMED) return;
    const amount = Number(booking.amount);
    const guideWallet = await this.ensureWallet(m, booking.guide.userId);
    const travelerWallet = await this.ensureWallet(m, booking.travelerId);

    let penaltyToGuide = 0;
    if (!byGuide) {
      // Traveler-initiated. Late cancel keeps a 20% penalty for the guide.
      const start = new Date(booking.startDate).getTime();
      const hoursToStart = (start - Date.now()) / 3600_000;
      if (hoursToStart < LATE_CANCEL_HOURS) {
        penaltyToGuide = +(amount * TRAVELER_LATE_PENALTY_RATE).toFixed(2);
      }
    }
    const refundToTraveler = +(amount - penaltyToGuide).toFixed(2);

    // Guide side: release frozen, optionally keep penalty.
    guideWallet.balanceFrozen = Math.max(0, Number(guideWallet.balanceFrozen) - amount);
    if (penaltyToGuide > 0) {
      guideWallet.balanceAvailable = Number(guideWallet.balanceAvailable) + penaltyToGuide;
    }
    await m.getRepository(Wallet).save(guideWallet);

    // Traveler side: credit the refundable portion back into their wallet.
    if (refundToTraveler > 0) {
      travelerWallet.balanceAvailable = Number(travelerWallet.balanceAvailable) + refundToTraveler;
      await m.getRepository(Wallet).save(travelerWallet);
    }

    const txnRepo = m.getRepository(WalletTransaction);
    // Ledger row on the guide wallet (debit of frozen).
    await txnRepo.save(
      txnRepo.create({
        walletId: guideWallet.id,
        type: WalletTxnType.REFUND,
        amount: -(amount - penaltyToGuide),
        currency: booking.currency,
        bookingId: booking.id,
        note: byGuide
          ? 'Booking cancelled by guide; full refund'
          : penaltyToGuide > 0
            ? `Late traveler cancellation; 20% penalty kept`
            : 'Traveler cancellation; full refund',
      }),
    );
    if (penaltyToGuide > 0) {
      await txnRepo.save(
        txnRepo.create({
          walletId: guideWallet.id,
          type: WalletTxnType.PENALTY,
          amount: penaltyToGuide,
          currency: booking.currency,
          bookingId: booking.id,
          note: 'Late-cancel penalty credited',
        }),
      );
    }
  }

  /** Make sure a wallet row exists for a user. */
  private async ensureWallet(m: EntityManager, userId: string): Promise<Wallet> {
    const repo = m.getRepository(Wallet);
    const w = await repo.findOne({ where: { userId } });
    if (w) return w;
    return repo.save(repo.create({ userId, balanceAvailable: 0, balanceFrozen: 0 }));
  }

  /**
   * Debit a traveler's wallet for a booking payment. Throws if the traveler
   * doesn't have enough available balance — they need to top up first.
   */
  private async debitTraveler(
    m: EntityManager,
    travelerId: string,
    amount: number,
    currency: string,
    bookingId: string,
  ) {
    const wallet = await this.ensureWallet(m, travelerId);
    if (Number(wallet.balanceAvailable) < amount) {
      throw new BadRequestException(
        'Số dư ví không đủ. Vui lòng nạp thêm tiền trước khi thanh toán.',
      );
    }
    wallet.balanceAvailable = Number(wallet.balanceAvailable) - amount;
    await m.getRepository(Wallet).save(wallet);
    await m.getRepository(WalletTransaction).save(
      m.getRepository(WalletTransaction).create({
        walletId: wallet.id,
        type: WalletTxnType.PAYMENT,
        amount: -amount,
        currency,
        bookingId,
        note: 'Booking payment',
      }),
    );
  }

  /* ───────────────────────────── Wallet API ──────────────────────────── */

  /** Wallet snapshot + recent transactions for the current user. */
  async getMyWallet(userId: string) {
    const wallet = await this.dataSource.transaction((m) => this.ensureWallet(m, userId));
    const transactions = await this.txns.find({
      where: { walletId: wallet.id },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return { wallet, transactions };
  }

  /**
   * Admin manually credits any user's wallet. This is the deposit gateway —
   * users can't self-top-up, they need the admin to add funds to their
   * available balance. Recorded as a TOPUP transaction.
   */
  async adminTopUp(
    targetUserId: string,
    amount: number,
    note?: string,
  ): Promise<WalletTransaction> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const target = await this.users.findOne({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException('User not found');
    return this.dataSource.transaction(async (m) => {
      const wallet = await this.ensureWallet(m, targetUserId);
      wallet.balanceAvailable = Number(wallet.balanceAvailable) + amount;
      await m.getRepository(Wallet).save(wallet);
      return m.getRepository(WalletTransaction).save(
        m.getRepository(WalletTransaction).create({
          walletId: wallet.id,
          type: WalletTxnType.TOPUP,
          amount,
          currency: wallet.currency,
          note: note?.trim() || 'Admin top-up',
        }),
      );
    });
  }

  /** Single-booking detail with full relations — used by /bookings/:id. */
  async getBookingDetail(bookingId: string, viewerId: string): Promise<GuideBooking> {
    const booking = await this.bookings.findOne({
      where: { id: bookingId },
      relations: ['guide', 'guide.user', 'traveler', 'trip'],
    });
    if (!booking) throw new NotFoundException('Booking not found');
    const viewerIsTraveler = booking.travelerId === viewerId;
    const viewerIsGuide = booking.guide.userId === viewerId;
    if (!viewerIsTraveler && !viewerIsGuide) {
      throw new ForbiddenException('You cannot view this booking');
    }
    return booking;
  }


  /** Guide creates a withdrawal request. Funds locked until admin decides. */
  async requestWithdrawal(userId: string, dto: WithdrawDto): Promise<WalletTransaction> {
    return this.dataSource.transaction(async (m) => {
      const w = await this.ensureWallet(m, userId);
      if (Number(w.balanceAvailable) < dto.amount) {
        throw new BadRequestException('Insufficient available balance');
      }
      w.balanceAvailable = Number(w.balanceAvailable) - dto.amount;
      await m.getRepository(Wallet).save(w);
      return m.getRepository(WalletTransaction).save(
        m.getRepository(WalletTransaction).create({
          walletId: w.id,
          type: WalletTxnType.WITHDRAW_REQUEST,
          status: WalletTxnStatus.PENDING,
          amount: -dto.amount,
          currency: w.currency,
          bankAccount: dto.bankAccount,
          note: 'Withdrawal pending admin review',
        }),
      );
    });
  }

  /** Admin approves / rejects a pending withdrawal. */
  async decideWithdrawal(
    txnId: string,
    dto: WithdrawDecisionDto,
  ): Promise<WalletTransaction> {
    return this.dataSource.transaction(async (m) => {
      const txn = await m.getRepository(WalletTransaction).findOne({ where: { id: txnId } });
      if (!txn) throw new NotFoundException('Transaction not found');
      if (txn.type !== WalletTxnType.WITHDRAW_REQUEST || txn.status !== WalletTxnStatus.PENDING) {
        throw new BadRequestException('Withdrawal already handled');
      }
      const w = await m.getRepository(Wallet).findOneByOrFail({ id: txn.walletId });
      const amount = Math.abs(Number(txn.amount));
      if (dto.action === 'approve') {
        txn.status = WalletTxnStatus.SUCCESS;
        txn.type = WalletTxnType.WITHDRAW_SUCCESS;
        txn.note = 'Withdrawal approved by admin';
      } else if (dto.action === 'reject') {
        txn.status = WalletTxnStatus.FAILED;
        txn.type = WalletTxnType.WITHDRAW_REJECTED;
        txn.note = dto.reason ?? 'Withdrawal rejected by admin';
        // Refund into available balance.
        w.balanceAvailable = Number(w.balanceAvailable) + amount;
        await m.getRepository(Wallet).save(w);
      } else {
        throw new BadRequestException('Unknown action');
      }
      return m.getRepository(WalletTransaction).save(txn);
    });
  }

  /** Admin: list pending withdrawal requests across the platform. */
  async pendingWithdrawals() {
    const rows = await this.txns
      .createQueryBuilder('t')
      .leftJoin(Wallet, 'w', 'w.id = t.wallet_id')
      .leftJoin(User, 'u', 'u.id = w.user_id')
      .where('t.type = :type', { type: WalletTxnType.WITHDRAW_REQUEST })
      .andWhere('t.status = :status', { status: WalletTxnStatus.PENDING })
      .select([
        't.id AS id',
        't.wallet_id AS "walletId"',
        't.amount AS amount',
        't.currency AS currency',
        't.note AS note',
        't.bank_account AS "bankAccount"',
        't.created_at AS "createdAt"',
        'u.id AS "userId"',
        'u.name AS "userName"',
        'u.email AS "userEmail"',
        'u.avatar AS "userAvatar"',
      ])
      .orderBy('t.created_at', 'ASC')
      .getRawMany();
    return rows.map((r) => ({
      id: r.id,
      walletId: r.walletId,
      amount: Number(r.amount),
      currency: r.currency,
      note: r.note,
      bankAccount: r.bankAccount,
      createdAt: r.createdAt,
      user: { id: r.userId, name: r.userName, email: r.userEmail, avatar: r.userAvatar },
    }));
  }
}
