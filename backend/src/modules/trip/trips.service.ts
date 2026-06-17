import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';
import { Trip, TripStatus } from './entities/trip.entity';
import { TripMember, TripMemberRole } from './entities/trip-member.entity';
import {
  JoinRequestStatus,
  TripJoinRequest,
} from './entities/trip-join-request.entity';
import { ItineraryDay } from './entities/itinerary-day.entity';
import { ItineraryActivity } from './entities/itinerary-activity.entity';
import { TripInteraction } from './entities/trip-interaction.entity';
import { User, TravelPreferences } from '@/modules/user/entities/user.entity';
import { UserPreference } from '@/modules/user/entities/user-preference.entity';
import {
  CreateTripDto,
  ItineraryDayDto,
  QueryTripsDto,
  UpdateTripDto,
} from './dto/trip.dto';
import { PaginatedResponse } from '@/common/types/api-response.type';
import { NotificationsService } from '@/modules/notification/notifications.service';
import { NotificationType } from '@/modules/notification/entities/notification.entity';
import { MessagesService } from '@/modules/message/messages.service';
import { SavedService } from '@/modules/saved/saved.service';

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(
    @InjectRepository(Trip) private readonly trips: Repository<Trip>,
    @InjectRepository(TripMember) private readonly members: Repository<TripMember>,
    @InjectRepository(TripJoinRequest)
    private readonly requests: Repository<TripJoinRequest>,
    @InjectRepository(ItineraryDay) private readonly days: Repository<ItineraryDay>,
    @InjectRepository(ItineraryActivity)
    private readonly activities: Repository<ItineraryActivity>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(UserPreference)
    private readonly userPrefs: Repository<UserPreference>,
    @InjectRepository(TripInteraction)
    private readonly interactions: Repository<TripInteraction>,
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
    private readonly messages: MessagesService,
    private readonly saved: SavedService,
  ) {}

  /**
   * Daily job: mark trips whose end date has passed as COMPLETED. Keeps the
   * persisted status in sync with reality so filters, recommendations, and the
   * post-trip review flow behave correctly without relying on the FE's
   * date-derived status. Only published trips are touched — draft/cancelled/
   * already-completed are left alone. Runs at 00:05 server time each day.
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async autoCompletePastTrips(): Promise<void> {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const result = await this.trips
      .createQueryBuilder()
      .update(Trip)
      .set({ status: TripStatus.COMPLETED })
      .where('status = :published', { published: TripStatus.PUBLISHED })
      .andWhere('end_date < :today', { today: todayStr })
      .execute();
    const affected = result.affected ?? 0;
    if (affected > 0) {
      this.logger.log(`Auto-completed ${affected} trip(s) past their end date`);
    }
  }

  async list(q: QueryTripsDto, viewerId?: string): Promise<PaginatedResponse<Trip>> {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const qb = this.trips
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.category', 'cat')
      .leftJoinAndSelect('t.creator', 'creator')
      .leftJoinAndSelect('t.guide', 'guide');
    if (q.destination) qb.andWhere('t.destination ILIKE :d', { d: `%${q.destination}%` });
    if (q.category) qb.andWhere('cat.key = :c', { c: q.category });
    if (q.status) qb.andWhere('t.status = :s', { s: q.status });
    if (q.creatorId) qb.andWhere('t.creator_id = :cid', { cid: q.creatorId });
    if (q.startDate) qb.andWhere('t.start_date >= :sd', { sd: q.startDate });
    if (q.endDate) qb.andWhere('t.end_date <= :ed', { ed: q.endDate });
    if (q.search) {
      qb.andWhere(
        new Brackets((b) =>
          b
            .where('t.title ILIKE :kw', { kw: `%${q.search}%` })
            .orWhere('t.description ILIKE :kw', { kw: `%${q.search}%` }),
        ),
      );
    }
    qb.orderBy(`t.${q.sortBy ?? 'createdAt'}`, (q.sortOrder ?? 'desc').toUpperCase() as 'ASC' | 'DESC');

    const [data, total] = await qb.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    // Bulk-fetch saved set for the page so the FE can render bookmark state.
    const savedSet = await this.saved.lookupSet(
      viewerId ?? '',
      'trip',
      data.map((t) => t.id),
    );
    const decorated = data.map((t) => ({ ...t, isSaved: savedSet.has(t.id) }));
    return {
      data: decorated as Trip[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findById(id: string): Promise<Trip> {
    const trip = await this.trips.findOne({
      where: { id },
      relations: ['category', 'creator', 'guide', 'members', 'members.user', 'itinerary', 'itinerary.activities'],
    });
    if (!trip) throw new NotFoundException('Trip not found');
    // Activities are loaded via a many-side relation, so the order isn't
    // guaranteed by Postgres. Apply the same ordering FE expects.
    if (trip.itinerary?.length) {
      trip.itinerary.sort((a, b) => a.dayNumber - b.dayNumber);
      for (const day of trip.itinerary) {
        day.activities?.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      }
    }
    return trip;
  }

  /** Detail enriched with viewer-aware fields used by the FE. */
  async findByIdForViewer(id: string, viewerId?: string) {
    const trip = await this.findById(id);
    const isOwner = !!viewerId && trip.creatorId === viewerId;
    const isJoined = viewerId
      ? trip.members?.some((m) => m.userId === viewerId) ?? false
      : false;
    let isSaved = false;
    if (viewerId) {
      const set = await this.saved.lookupSet(viewerId, 'trip', [id]);
      isSaved = set.has(id);
    }

    // Status of *the viewer's* current pending join request, if any.
    let joinRequestStatus: JoinRequestStatus | null = null;
    if (viewerId && !isJoined) {
      const ownReq = await this.requests.findOne({
        where: { tripId: id, userId: viewerId },
        order: { createdAt: 'DESC' },
      });
      joinRequestStatus = ownReq?.status ?? null;
    }

    // Owner-only: list of pending requests so they can accept/reject.
    let pendingRequests:
      | Array<{
          id: string;
          message?: string;
          createdAt: Date;
          user: { id: string; name: string; avatar?: string; handle?: string };
        }>
      | undefined;
    if (isOwner) {
      const reqs = await this.requests.find({
        where: { tripId: id, status: JoinRequestStatus.PENDING },
        order: { createdAt: 'ASC' },
      });
      pendingRequests = reqs.map((r) => ({
        id: r.id,
        message: r.message,
        createdAt: r.createdAt,
        user: {
          id: r.user.id,
          name: r.user.name,
          avatar: r.user.avatar,
          handle: r.user.handle,
        },
      }));
    }

    return { ...trip, isOwner, isJoined, joinRequestStatus, pendingRequests, isSaved };
  }

  async create(creatorId: string, dto: CreateTripDto): Promise<Trip> {
    // Business rule: a user can't be on two trips at once. Reject creation when
    // the new trip's [startDate, endDate] overlaps any trip the user already
    // created or joined (excluding cancelled ones).
    await this.assertNoDateConflict(creatorId, dto.startDate, dto.endDate);

    const tripId = await this.dataSource.transaction(async (m) => {
      const trip = m.getRepository(Trip).create({
        ...dto,
        creatorId,
        memberCount: 1,
        status: TripStatus.PUBLISHED,
      });
      const saved = await m.getRepository(Trip).save(trip);

      // Add creator as leader
      await m.getRepository(TripMember).save(
        m.getRepository(TripMember).create({
          tripId: saved.id,
          userId: creatorId,
          role: TripMemberRole.LEADER,
        }),
      );

      if (dto.itinerary?.length) {
        await this.saveItinerary(
          m.getRepository(ItineraryDay),
          m.getRepository(ItineraryActivity),
          saved.id,
          dto.itinerary,
        );
      }
      return saved.id;
    });
    // Re-load with relations after the transaction commits.
    const fresh = await this.findById(tripId);

    // Spin up the trip's group chat. Run after the transaction so the
    // conversation row references a committed trip. Don't block the response
    // if chat creation fails — log and continue.
    void this.messages
      .ensureTripGroup(fresh.id, creatorId, fresh.title, fresh.coverImage)
      .catch(() => undefined);

    return fresh;
  }

  /**
   * Throw a 400 if the user already created or joined a trip whose date range
   * overlaps [startDate, endDate]. Two ranges [a,b] and [c,d] overlap iff
   * a <= d AND c <= b. Cancelled trips are ignored. The error message names
   * the first conflicting trip so the FE can show a helpful explanation.
   */
  private async assertNoDateConflict(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<void> {
    const conflict = await this.findDateConflict(userId, startDate, endDate);
    if (conflict) {
      const from = new Date(conflict.startDate).toLocaleDateString('vi-VN');
      const to = new Date(conflict.endDate).toLocaleDateString('vi-VN');
      throw new BadRequestException(
        `Bạn đã có chuyến đi "${conflict.title}" (${from} – ${to}) trùng với khoảng thời gian này. ` +
          `Vui lòng chọn ngày khác hoặc rời chuyến đi đó trước.`,
      );
    }
  }

  /**
   * Tìm chuyến đi của user trùng khoảng [startDate, endDate]. Không ném lỗi —
   * trả về Trip xung đột đầu tiên hoặc null. Dùng cho trợ lý AI để báo nhẹ
   * nhàng thay vì văng exception.
   */
  async findDateConflict(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<Trip | null> {
    if (!userId || !startDate || !endDate) return null;
    return this.trips
      .createQueryBuilder('t')
      .innerJoin(TripMember, 'm', 'm.trip_id = t.id AND m.user_id = :userId', { userId })
      .where('t.status != :cancelled', { cancelled: TripStatus.CANCELLED })
      .andWhere('t.start_date <= :endDate', { endDate })
      .andWhere('t.end_date >= :startDate', { startDate })
      .orderBy('t.start_date', 'ASC')
      .getOne();
  }

  async update(id: string, userId: string, dto: UpdateTripDto): Promise<Trip> {
    const trip = await this.findById(id);
    if (trip.creatorId !== userId) throw new ForbiddenException('Only creator can update');
    Object.assign(trip, dto);
    await this.trips.save(trip);
    const fresh = await this.findById(id);

    // Notify every member except the creator that the trip changed.
    // Run async; we don't fail the request if notifications hiccup.
    void this.notifyMembersOfUpdate(fresh, userId).catch(() => undefined);

    return fresh;
  }

  /** Push a TRIP_UPDATE notification to every member (except the actor). */
  private async notifyMembersOfUpdate(trip: Trip, actorId: string) {
    const recipients = (trip.members ?? [])
      .map((m) => m.userId)
      .filter((uid) => uid && uid !== actorId);
    if (recipients.length === 0) return;
    await Promise.all(
      recipients.map((uid) =>
        this.notifications.push({
          userId: uid,
          type: NotificationType.TRIP_UPDATE,
          actorId,
          title: `Chuyến "${trip.title}" vừa được cập nhật`,
          preview: `Chủ chuyến đã thay đổi thông tin của ${trip.destination}.`,
          ctaLabel: 'Xem chi tiết',
          ctaHref: `/trips/${trip.id}`,
          image: trip.coverImage,
        }),
      ),
    );
  }

  async remove(id: string, userId: string): Promise<void> {
    const trip = await this.findById(id);
    if (trip.creatorId !== userId) throw new ForbiddenException('Only creator can delete');
    await this.trips.delete({ id });
  }

  /**
   * Cancel a trip (creator only). Marks status = cancelled, notifies every
   * member except the creator, and posts a system message into the group chat.
   * Cancelling is reversible-by-recreate only; we keep the row so history and
   * reviews survive.
   */
  async cancelTrip(id: string, userId: string): Promise<Trip> {
    const trip = await this.findById(id);
    if (trip.creatorId !== userId) throw new ForbiddenException('Only creator can cancel');
    if (trip.status === TripStatus.CANCELLED) {
      throw new BadRequestException('Trip already cancelled');
    }
    if (trip.status === TripStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed trip');
    }
    trip.status = TripStatus.CANCELLED;
    await this.trips.save(trip);
    const fresh = await this.findById(id);

    // Notify members + post a chat notice. Best-effort, non-blocking.
    void this.notifyMembersOfCancel(fresh, userId).catch(() => undefined);

    return fresh;
  }

  /** Push a TRIP_CANCELLED notification to every member (except the actor). */
  private async notifyMembersOfCancel(trip: Trip, actorId: string) {
    const recipients = (trip.members ?? [])
      .map((m) => m.userId)
      .filter((uid) => uid && uid !== actorId);
    if (recipients.length === 0) return;
    await Promise.all(
      recipients.map((uid) =>
        this.notifications.push({
          userId: uid,
          type: NotificationType.TRIP_CANCELLED,
          actorId,
          title: `Chuyến "${trip.title}" đã bị huỷ`,
          preview: `Chủ chuyến đã huỷ chuyến đi ${trip.destination}. Rất tiếc vì sự bất tiện này.`,
          ctaLabel: 'Xem chi tiết',
          ctaHref: `/trips/${trip.id}`,
          image: trip.coverImage,
        }),
      ),
    );
  }

  async requestJoin(tripId: string, userId: string, message?: string) {
    const trip = await this.findById(tripId);
    if (trip.memberCount >= trip.maxMembers) throw new BadRequestException('Trip is full');
    if (trip.creatorId === userId) throw new BadRequestException('Creator already in trip');
    const existingMember = await this.members.findOne({ where: { tripId, userId } });
    if (existingMember) throw new BadRequestException('Already a member');

    // The (tripId, userId) unique index on trip_join_requests means we can never
    // INSERT twice for the same pair. If a previous request exists (rejected,
    // cancelled, or even an old accepted one that lingered after a leave), reset
    // it back to pending instead of throwing a DB error.
    const existing = await this.requests.findOne({
      where: { tripId, userId },
      order: { createdAt: 'DESC' },
    });
    if (existing) {
      if (existing.status === JoinRequestStatus.PENDING) return existing;
      existing.status = JoinRequestStatus.PENDING;
      existing.message = message ?? existing.message;
      existing.respondedAt = null;
      const saved = await this.requests.save(existing);
      void this.notifyJoinRequested(trip, userId).catch(() => undefined);
      return saved;
    }

    const created = await this.requests.save(
      this.requests.create({ tripId, userId, message }),
    );
    // Độ hot: đếm lượt request toàn hệ thống + đánh dấu interaction của user.
    await this.trips.increment({ id: tripId }, 'requestCount', 1);
    void this.markInteractionFlag(userId, tripId, 'requested').catch(() => undefined);
    void this.notifyJoinRequested(trip, userId).catch(() => undefined);
    return created;
  }

  /** Notify the creator that someone requested to join their trip. */
  private async notifyJoinRequested(trip: Trip, requesterId: string) {
    const requester = await this.users.findOne({ where: { id: requesterId } });
    const name = requester?.name ?? 'Một người dùng';
    await this.notifications.push({
      userId: trip.creatorId,
      type: NotificationType.TRIP_JOIN_REQUEST,
      actorId: requesterId,
      title: `${name} muốn tham gia "${trip.title}"`,
      preview: `Có yêu cầu tham gia mới cho chuyến đi ${trip.destination}. Duyệt hoặc từ chối ngay.`,
      ctaLabel: 'Xem yêu cầu',
      ctaHref: `/trips/${trip.id}`,
      image: trip.coverImage,
    });
  }

  /** Notify the requester that the creator accepted/rejected their join request. */
  private async notifyJoinResponded(trip: Trip, requesterId: string, accepted: boolean) {
    await this.notifications.push({
      userId: requesterId,
      type: accepted
        ? NotificationType.TRIP_JOIN_ACCEPTED
        : NotificationType.TRIP_JOIN_REJECTED,
      actorId: trip.creatorId,
      title: accepted
        ? `Yêu cầu tham gia "${trip.title}" đã được duyệt`
        : `Yêu cầu tham gia "${trip.title}" đã bị từ chối`,
      preview: accepted
        ? `Bạn đã trở thành thành viên của chuyến đi ${trip.destination}. Mở nhóm chat để bắt đầu!`
        : `Chủ chuyến đã từ chối yêu cầu tham gia ${trip.destination} của bạn.`,
      ctaLabel: 'Xem chuyến đi',
      ctaHref: `/trips/${trip.id}`,
      image: trip.coverImage,
    });
  }

  async respondJoin(tripId: string, requestId: string, userId: string, accept: boolean) {
    const trip = await this.findById(tripId);
    if (trip.creatorId !== userId) throw new ForbiddenException('Only creator can respond');
    const req = await this.requests.findOne({ where: { id: requestId, tripId } });
    if (!req) throw new NotFoundException('Request not found');
    if (req.status !== JoinRequestStatus.PENDING) throw new BadRequestException('Already handled');

    const result = await this.dataSource.transaction(async (m) => {
      req.status = accept ? JoinRequestStatus.ACCEPTED : JoinRequestStatus.REJECTED;
      req.respondedAt = new Date();
      await m.getRepository(TripJoinRequest).save(req);

      if (accept) {
        await m.getRepository(TripMember).save(
          m.getRepository(TripMember).create({ tripId, userId: req.userId }),
        );
        await m.getRepository(Trip).increment({ id: tripId }, 'memberCount', 1);
      }
      return req;
    });

    // After commit: pull the new traveler into the trip's group chat. Best-effort.
    if (accept) {
      void this.messages
        .ensureTripGroup(trip.id, trip.creatorId, trip.title, trip.coverImage)
        .then((conv) => this.messages.addMember(conv.id, req.userId))
        .catch(() => undefined);
    }

    // Notify the requester of the outcome (accepted / rejected). Best-effort.
    void this.notifyJoinResponded(trip, req.userId, accept).catch(() => undefined);

    return result;
  }

  async leave(tripId: string, userId: string): Promise<{ memberCount: number }> {
    const trip = await this.findById(tripId);
    if (trip.creatorId === userId) throw new BadRequestException('Creator cannot leave their own trip');
    const member = await this.members.findOne({ where: { tripId, userId } });
    if (!member) throw new NotFoundException('Not a member');
    await this.dataSource.transaction(async (m) => {
      await m.getRepository(TripMember).delete({ id: member.id });
      await m.getRepository(Trip).decrement({ id: tripId }, 'memberCount', 1);
    });
    // Drop them from the group chat too.
    void this.messages.removeMemberByTripId(tripId, userId).catch(() => undefined);
    const updated = await this.findById(tripId);
    return { memberCount: updated.memberCount };
  }

  async kickMember(tripId: string, memberUserId: string, byUserId: string): Promise<void> {
    const trip = await this.findById(tripId);
    if (trip.creatorId !== byUserId) throw new ForbiddenException('Only creator can remove members');
    if (memberUserId === trip.creatorId) throw new BadRequestException('Cannot remove creator');
    const member = await this.members.findOne({ where: { tripId, userId: memberUserId } });
    if (!member) throw new NotFoundException('Member not found');
    await this.dataSource.transaction(async (m) => {
      await m.getRepository(TripMember).delete({ id: member.id });
      await m.getRepository(Trip).decrement({ id: tripId }, 'memberCount', 1);
    });
    void this.messages.removeMemberByTripId(tripId, memberUserId).catch(() => undefined);
  }

  async hireGuide(tripId: string, guideUserId: string, byUserId: string): Promise<Trip> {
    const trip = await this.findById(tripId);
    if (trip.creatorId !== byUserId) throw new ForbiddenException('Only creator can hire a guide');
    const previousGuideId = trip.guideId;
    trip.guideId = guideUserId;
    await this.trips.save(trip);

    // Pull the hired guide into the group chat too. If a previous guide
    // existed, remove them so the room reflects the current crew.
    void (async () => {
      const conv = await this.messages.findByTripId(tripId);
      if (!conv) return;
      if (previousGuideId && previousGuideId !== guideUserId) {
        await this.messages.removeMember(conv.id, previousGuideId);
      }
      await this.messages.addMember(conv.id, guideUserId);
    })().catch(() => undefined);

    return this.findById(tripId);
  }

  listMine(userId: string) {
    return this.trips.find({ where: { creatorId: userId }, order: { createdAt: 'DESC' } });
  }

  async listJoined(userId: string) {
    const memberships = await this.members.find({ where: { userId }, relations: ['trip'] });
    return memberships.map((m) => m.trip);
  }

  /** Replace itinerary days/activities for a trip. */
  async upsertItinerary(tripId: string, userId: string, days: ItineraryDayDto[]) {
    const trip = await this.findById(tripId);
    if (trip.creatorId !== userId) throw new ForbiddenException('Only creator can edit itinerary');
    return this.dataSource.transaction(async (m) => {
      await m.getRepository(ItineraryDay).delete({ tripId });
      await this.saveItinerary(m.getRepository(ItineraryDay), m.getRepository(ItineraryActivity), tripId, days);
      return this.findById(tripId);
    });
  }

  private async saveItinerary(
    daysRepo: Repository<ItineraryDay>,
    actsRepo: Repository<ItineraryActivity>,
    tripId: string,
    days: ItineraryDayDto[],
  ) {
    for (const d of days) {
      const day = await daysRepo.save(
        daysRepo.create({
          tripId,
          dayNumber: d.dayNumber,
          date: d.date,
          title: d.title,
        }),
      );
      const acts = (d.activities ?? []).map((a, i) =>
        actsRepo.create({ ...a, dayId: day.id, sortOrder: i }),
      );
      if (acts.length) await actsRepo.save(acts);
    }
  }

  /* ────────────────────────── Recommendations ────────────────────────── */

  /**
   * Weighted recommender. Điểm cuối của mỗi chuyến:
   *
   *   final = 0.3 * match + 0.3 * interaction + 0.4 * hot
   *
   * Trong đó (mỗi thành phần được min–max chuẩn hoá về [0,1] trên tập ứng viên):
   *  - match       : độ hợp sở thích — category + tag + province khớp prefs/hashtag.
   *  - interaction : tương tác của CHÍNH user với chuyến — views, clicks, favorite, request.
   *  - hot         : độ hot toàn hệ thống — view_count, click_count, request_count, member.
   *
   * Trả về top `limit` chuyến (điểm cao lên đầu) kèm breakdown để giải thích.
   */
  async recommend(
    viewerId: string | undefined,
    limit = 6,
  ): Promise<
    Array<
      Trip & {
        recommendScore: number;
        recommendReasons: string[];
        scoreBreakdown: { match: number; interaction: number; hot: number };
      }
    >
  > {
    const user = viewerId
      ? await this.users.findOne({ where: { id: viewerId } })
      : null;
    const prefs: TravelPreferences = user?.preferences ?? {};
    const structured = viewerId
      ? await this.userPrefs.findOne({ where: { userId: viewerId } })
      : null;

    // ── Pool token sở thích (cho thành phần MATCH) ──
    const prefTokens = new Set<string>();
    const addAll = (arr?: string[] | null) =>
      arr?.forEach((s) => s && prefTokens.add(String(s).toLowerCase()));
    addAll(prefs.travelStyles);
    addAll(prefs.tripPurposes);
    addAll(prefs.terrainPrefs);
    addAll(prefs.activities);
    if (prefs.budgetLevel) prefTokens.add(prefs.budgetLevel.toLowerCase());
    addAll(structured?.categories);
    addAll(structured?.interests);
    if (structured?.budgetTier) prefTokens.add(structured.budgetTier.toLowerCase());
    const provinceTokens = new Set<string>(
      (structured?.provinces ?? []).map((p) => String(p).toLowerCase()),
    );

    const today = new Date().toISOString().slice(0, 10);
    const candidates = await this.trips
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.category', 'cat')
      .leftJoinAndSelect('t.creator', 'creator')
      .leftJoinAndSelect('t.guide', 'guide')
      .where('t.status = :st', { st: TripStatus.PUBLISHED })
      .andWhere('t.start_date >= :today', { today })
      .take(120)
      .getMany();

    if (candidates.length === 0) return [];

    // ── Tương tác của user với các chuyến ứng viên (cho thành phần INTERACTION) ──
    const interMap = new Map<string, TripInteraction>();
    if (viewerId) {
      const rows = await this.interactions.find({
        where: { userId: viewerId },
      });
      rows.forEach((r) => interMap.set(r.tripId, r));
    }

    // ── Tính điểm thô từng thành phần ──
    type Raw = {
      trip: Trip;
      matchRaw: number;
      interRaw: number;
      hotRaw: number;
      reasons: string[];
    };
    const raws: Raw[] = candidates.map((trip) => {
      const reasons: string[] = [];

      // MATCH: category(+3) + mỗi tag khớp(+2) + province khớp(+3).
      let matchRaw = 0;
      const catKey = trip.category?.key?.toLowerCase();
      if (catKey && prefTokens.has(catKey)) {
        matchRaw += 3;
        reasons.push(`Hợp gu ${trip.category.label}`);
      }
      const tagOverlap = (trip.tags ?? []).filter((t) => prefTokens.has(t.toLowerCase()));
      if (tagOverlap.length) {
        matchRaw += tagOverlap.length * 2;
        reasons.push(`Tag khớp: ${tagOverlap.slice(0, 3).join(', ')}`);
      }
      if (provinceTokens.size) {
        const dest = (trip.destination ?? '').toLowerCase();
        if ([...provinceTokens].some((p) => p && (dest.includes(p) || p.includes(dest)))) {
          matchRaw += 3;
          reasons.push(`Đúng nơi bạn thích: ${trip.destination}`);
        }
      }

      // INTERACTION: views + 2*clicks + 4*favorite + 5*request (của chính user).
      const it = interMap.get(trip.id);
      const interRaw = it
        ? it.views + it.clicks * 2 + (it.favorited ? 4 : 0) + (it.requested ? 5 : 0)
        : 0;
      if (interRaw > 0) reasons.push('Bạn từng quan tâm chuyến này');

      // HOT: view_count + 2*click_count + 3*request_count + 2*member_count (toàn hệ thống).
      const hotRaw =
        (trip.viewCount ?? 0) +
        (trip.clickCount ?? 0) * 2 +
        (trip.requestCount ?? 0) * 3 +
        (trip.memberCount ?? 0) * 2;

      return { trip, matchRaw, interRaw, hotRaw, reasons };
    });

    // ── Min–max chuẩn hoá mỗi thành phần về [0,1] ──
    const norm = (vals: number[]) => {
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const span = max - min;
      return (v: number) => (span === 0 ? 0 : (v - min) / span);
    };
    const nMatch = norm(raws.map((r) => r.matchRaw));
    const nInter = norm(raws.map((r) => r.interRaw));
    const nHot = norm(raws.map((r) => r.hotRaw));

    const scored = raws.map((r) => {
      const match = +nMatch(r.matchRaw).toFixed(4);
      const interaction = +nInter(r.interRaw).toFixed(4);
      const hot = +nHot(r.hotRaw).toFixed(4);
      const recommendScore = +(0.3 * match + 0.3 * interaction + 0.4 * hot).toFixed(4);
      if (hot >= 0.75) r.reasons.push('Đang hot');
      return {
        ...r.trip,
        recommendScore,
        recommendReasons: r.reasons,
        scoreBreakdown: { match, interaction, hot },
      };
    });

    scored.sort((a, b) => b.recommendScore - a.recommendScore);
    const top = scored.slice(0, limit);

    const savedSet = await this.saved.lookupSet(
      viewerId ?? '',
      'trip',
      top.map((t) => t.id),
    );
    return top.map((t) => ({ ...t, isSaved: savedSet.has(t.id) })) as Array<
      Trip & {
        recommendScore: number;
        recommendReasons: string[];
        scoreBreakdown: { match: number; interaction: number; hot: number };
      }
    >;
  }

  /* ───────────────────── Interaction tracking ───────────────────── */

  /** Tăng view_count toàn hệ thống + ghi nhận view của user (nếu đăng nhập). */
  async recordView(tripId: string, userId?: string): Promise<void> {
    await this.trips.increment({ id: tripId }, 'viewCount', 1);
    if (userId) await this.bumpInteraction(userId, tripId, 'views');
  }

  /** Tăng click_count toàn hệ thống + ghi nhận click của user (nếu đăng nhập). */
  async recordClick(tripId: string, userId?: string): Promise<void> {
    await this.trips.increment({ id: tripId }, 'clickCount', 1);
    if (userId) await this.bumpInteraction(userId, tripId, 'clicks');
  }

  /** Upsert hàng trip_interactions và cộng dồn counter / set cờ. */
  private async bumpInteraction(
    userId: string,
    tripId: string,
    field: 'views' | 'clicks',
  ): Promise<void> {
    const row = await this.interactions.findOne({ where: { userId, tripId } });
    if (row) {
      row[field] += 1;
      await this.interactions.save(row);
    } else {
      await this.interactions.save(
        this.interactions.create({ userId, tripId, [field]: 1 }),
      );
    }
  }

  /** Đánh dấu user đã favorite / request một chuyến (gọi từ Saved / requestJoin). */
  async markInteractionFlag(
    userId: string,
    tripId: string,
    flag: 'favorited' | 'requested',
    value = true,
  ): Promise<void> {
    const row = await this.interactions.findOne({ where: { userId, tripId } });
    if (row) {
      row[flag] = value;
      await this.interactions.save(row);
    } else {
      await this.interactions.save(
        this.interactions.create({ userId, tripId, [flag]: value }),
      );
    }
  }
}
