import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, In, Repository } from 'typeorm';
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
import { GuidesService } from '@/modules/guide/guides.service';
import { UserRole } from '@/common/enums/user-role.enum';

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
    // Giải phóng HDV khi huỷ chuyến (huỷ booking + hoàn tiền). forwardRef vì
    // TripsModule ↔ GuidesModule tham chiếu vòng qua module.
    @Inject(forwardRef(() => GuidesService))
    private readonly guides: GuidesService,
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
    const ids = data.map((t) => t.id);
    // Bulk-fetch saved set + the viewer's memberships for this page so the FE
    // can render bookmark state AND filter out trips the viewer already joined
    // (mục "Khám phá" chỉ nên hiện chuyến chưa tham gia). Một truy vấn gộp thay
    // vì dựa vào 2 cache rời ở FE — tránh trip đang tham gia lọt vào Khám phá
    // khi cache joined/created chưa kịp refetch.
    const [savedSet, memberRows] = await Promise.all([
      this.saved.lookupSet(viewerId ?? '', 'trip', ids),
      viewerId && ids.length
        ? this.members.find({
            where: { userId: viewerId, tripId: In(ids) },
            select: ['tripId'],
          })
        : Promise.resolve([] as TripMember[]),
    ]);
    const joinedSet = new Set(memberRows.map((m) => m.tripId));
    const decorated = data.map((t) => ({
      ...t,
      isSaved: savedSet.has(t.id),
      isOwner: !!viewerId && t.creatorId === viewerId,
      isJoined: joinedSet.has(t.id),
    }));
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
    // Buộc dữ liệu ngày hợp lệ: bắt buộc có start/end cụ thể, end >= start,
    // và đồng bộ durationDays theo khoảng ngày thực (số ngày bao gồm 2 đầu).
    this.normalizeDates(dto);
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
   * Buộc dữ liệu ngày của chuyến đi hợp lệ trước khi lưu (create/update).
   * - start_date & end_date phải là ngày cụ thể hợp lệ.
   * - end_date không được trước start_date.
   * - durationDays luôn = số ngày thực (bao gồm cả 2 đầu), bỏ qua giá trị FE
   *   gửi lên nếu lệch để DB không bao giờ có duration âm/sai.
   * Mutate trực tiếp object truyền vào.
   */
  private normalizeDates(dto: {
    startDate: string;
    endDate: string;
    durationDays?: number;
  }): void {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (!dto.startDate || isNaN(start.getTime())) {
      throw new BadRequestException('Ngày bắt đầu không hợp lệ.');
    }
    if (!dto.endDate || isNaN(end.getTime())) {
      throw new BadRequestException('Ngày kết thúc không hợp lệ.');
    }
    // So sánh theo ngày (bỏ giờ) cho ổn định múi giờ.
    const startDay = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
    const endDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
    if (endDay < startDay) {
      throw new BadRequestException('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.');
    }
    const realDays = Math.round((endDay - startDay) / 86_400_000) + 1;
    dto.durationDays = realDays;
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
    // Khi sửa ngày: gộp giá trị cũ + mới rồi validate (end >= start, đồng bộ duration).
    if (dto.startDate || dto.endDate || dto.durationDays != null) {
      const merged = {
        startDate: dto.startDate ?? trip.startDate,
        endDate: dto.endDate ?? trip.endDate,
        durationDays: dto.durationDays ?? trip.durationDays,
      };
      this.normalizeDates(merged);
      dto.startDate = merged.startDate;
      dto.endDate = merged.endDate;
      dto.durationDays = merged.durationDays;
    }
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
   * Huỷ chuyến đi. Cho phép CHỦ CHUYẾN hoặc ADMIN huỷ (admin xử lý vi phạm/đặc biệt).
   * Điều kiện: chuyến CHƯA khởi hành (today < startDate) và chưa completed/cancelled.
   * Khi huỷ: status=CANCELLED + lưu lý do/thời điểm/người huỷ → thông báo thành viên
   * → GIẢI PHÓNG HDV (huỷ booking + hoàn tiền) → thông báo HDV. requestJoin/respondJoin
   * tự chặn sau khi status=CANCELLED nên không ai đăng ký tiếp được.
   */
  async cancelTrip(
    id: string,
    userId: string,
    reason?: string,
    actorRole?: UserRole,
  ): Promise<Trip> {
    const trip = await this.findById(id);
    const isOwner = trip.creatorId === userId;
    const isAdmin = actorRole === UserRole.ADMIN;
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Chỉ chủ chuyến hoặc quản trị viên mới được huỷ chuyến.');
    }
    if (trip.status === TripStatus.CANCELLED) {
      throw new BadRequestException('Chuyến đi đã được huỷ trước đó.');
    }
    if (trip.status === TripStatus.COMPLETED) {
      throw new BadRequestException('Không thể huỷ chuyến đã hoàn thành.');
    }
    // Chuyến ĐÃ KHỞI HÀNH (today >= startDate) thì không cho huỷ — chỉ huỷ khi
    // còn ở trạng thái "đang tuyển / đã đủ thành viên nhưng chưa bắt đầu".
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(trip.startDate);
    start.setHours(0, 0, 0, 0);
    if (start.getTime() <= today.getTime()) {
      throw new BadRequestException('Chuyến đi đã khởi hành nên không thể huỷ.');
    }

    const cleanReason = reason?.trim() || (isAdmin ? 'Quản trị viên xử lý.' : 'Chủ chuyến huỷ.');
    trip.status = TripStatus.CANCELLED;
    trip.cancelReason = cleanReason;
    trip.cancelledAt = new Date();
    trip.cancelledById = userId;
    await this.trips.save(trip);
    const fresh = await this.findById(id);

    // Thông báo thành viên (best-effort, không chặn response).
    void this.notifyMembersOfCancel(fresh, userId, cleanReason, isAdmin).catch(() => undefined);
    // Giải phóng HDV: huỷ booking gắn chuyến + hoàn tiền + báo HDV (best-effort).
    void this.guides.releaseGuideForTrip(id, cleanReason).catch(() => undefined);

    return fresh;
  }

  /** Push a TRIP_CANCELLED notification to every member (except the actor). */
  private async notifyMembersOfCancel(
    trip: Trip,
    actorId: string,
    reason: string,
    byAdmin: boolean,
  ) {
    const recipients = (trip.members ?? [])
      .map((m) => m.userId)
      .filter((uid) => uid && uid !== actorId);
    if (recipients.length === 0) return;
    const who = byAdmin ? 'Quản trị viên' : 'Chủ chuyến';
    await Promise.all(
      recipients.map((uid) =>
        this.notifications.push({
          userId: uid,
          type: NotificationType.TRIP_CANCELLED,
          actorId,
          title: `Chuyến "${trip.title}" đã bị huỷ`,
          preview: `${who} đã huỷ chuyến đi ${trip.destination}. Lý do: ${reason}`,
          ctaLabel: 'Xem chi tiết',
          ctaHref: `/trips/${trip.id}`,
          image: trip.coverImage,
        }),
      ),
    );
  }

  async requestJoin(tripId: string, userId: string, message?: string) {
    const trip = await this.findById(tripId);
    // Chuyến đã huỷ/hoàn thành → KHÔNG cho đăng ký tham gia tiếp.
    if (trip.status === TripStatus.CANCELLED) {
      throw new BadRequestException('Chuyến đi đã bị huỷ, không thể đăng ký tham gia.');
    }
    if (trip.status === TripStatus.COMPLETED) {
      throw new BadRequestException('Chuyến đi đã kết thúc, không thể đăng ký tham gia.');
    }
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
    // Chuyến đã huỷ → không thể duyệt thêm thành viên.
    if (trip.status === TripStatus.CANCELLED) {
      throw new BadRequestException('Chuyến đi đã bị huỷ, không thể duyệt yêu cầu tham gia.');
    }
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
   * Trong đó:
   *  - match       : độ hợp sở thích (Content-based) — COSINE SIMILARITY giữa
   *                  vector sở thích user và vector đặc trưng chuyến, mỗi chiều
   *                  là một token (category / tag / tỉnh) gắn trọng số TF-IDF.
   *                  Token hiếm (vd 1 tỉnh ít chuyến) có IDF cao → đóng góp nhiều
   *                  hơn token phổ biến. Cosine ∈ [0,1] (vector không âm), tự
   *                  chuẩn hoá theo độ dài nên chuyến "nhồi nhiều tag" không lợi thế.
   *  - interaction : tương tác của CHÍNH user với chuyến — views, clicks, favorite, request.
   *                  (min–max chuẩn hoá về [0,1] trên tập ứng viên).
   *  - hot         : độ hot toàn hệ thống — view_count, click_count, request_count, member.
   *                  (min–max chuẩn hoá về [0,1] trên tập ứng viên).
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
    const candQb = this.trips
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.category', 'cat')
      .leftJoinAndSelect('t.creator', 'creator')
      .leftJoinAndSelect('t.guide', 'guide')
      .where('t.status = :st', { st: TripStatus.PUBLISHED })
      .andWhere('t.start_date >= :today', { today });
    // Không gợi ý chuyến người dùng đã tạo (owner) hoặc đã tham gia (member) —
    // mục gợi ý chỉ để khám phá chuyến MỚI, giống tab Khám phá.
    if (viewerId) {
      candQb
        .andWhere('t.creator_id != :viewerId', { viewerId })
        .andWhere(
          `NOT EXISTS (
            SELECT 1 FROM trip_members tm
            WHERE tm.trip_id = t.id AND tm.user_id = :viewerId
          )`,
          { viewerId },
        );
    }
    const candidates = await candQb.take(120).getMany();

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
      match: number;
      interRaw: number;
      hotRaw: number;
      reasons: string[];
    };

    // ── MATCH = COSINE SIMILARITY trên vector đặc trưng có trọng số TF-IDF ──
    // Mỗi chuyến là một "tài liệu" gồm các token đặc trưng: category key, các
    // tag, và token tỉnh (suy từ destination khớp tỉnh user thích). Trọng số mỗi
    // token = IDF: token càng hiếm trong tập ứng viên càng quan trọng. Cosine đo
    // góc giữa vector sở thích user và vector chuyến → tự chuẩn hoá theo độ dài.

    // Token đặc trưng của một chuyến (dùng chung cho dựng từ điển + tính vector).
    const provinceList = [...provinceTokens];
    const tripTerms = (trip: Trip): string[] => {
      const terms: string[] = [];
      const catKey = trip.category?.key?.toLowerCase();
      if (catKey) terms.push(`cat:${catKey}`);
      (trip.tags ?? []).forEach((t) => t && terms.push(`tag:${t.toLowerCase()}`));
      // Token tỉnh: chỉ thêm tỉnh user quan tâm mà destination chứa (để vector
      // user và trip cùng không gian — tỉnh ngoài sở thích không ảnh hưởng cosine).
      const dest = (trip.destination ?? '').toLowerCase();
      provinceList.forEach((p) => {
        if (p && (dest.includes(p) || p.includes(dest))) terms.push(`prov:${p}`);
      });
      return [...new Set(terms)];
    };

    // Document frequency: mỗi token xuất hiện ở bao nhiêu chuyến ứng viên.
    const docFreq = new Map<string, number>();
    const termsPerTrip = candidates.map((t) => {
      const terms = tripTerms(t);
      new Set(terms).forEach((tk) => docFreq.set(tk, (docFreq.get(tk) ?? 0) + 1));
      return terms;
    });
    const N = candidates.length;
    // IDF làm trơn: idf = ln((1+N)/(1+df)) + 1 → luôn dương, token hiếm điểm cao.
    const idf = (term: string): number =>
      Math.log((1 + N) / (1 + (docFreq.get(term) ?? 0))) + 1;

    // Vector sở thích user: gồm các token mà user khai (category/tag/tỉnh), trọng
    // số TF-IDF. TF của sở thích = 1 (mỗi token khai 1 lần). Chỉ giữ token có
    // trong từ điển ứng viên (token lạ không khớp chuyến nào → bỏ).
    const userTermSet = new Set<string>();
    prefTokens.forEach((tok) => {
      if (docFreq.has(`cat:${tok}`)) userTermSet.add(`cat:${tok}`);
      if (docFreq.has(`tag:${tok}`)) userTermSet.add(`tag:${tok}`);
    });
    provinceList.forEach((p) => {
      if (docFreq.has(`prov:${p}`)) userTermSet.add(`prov:${p}`);
    });
    const userVec = new Map<string, number>();
    userTermSet.forEach((tk) => userVec.set(tk, idf(tk)));
    let userNorm = 0;
    userVec.forEach((w) => (userNorm += w * w));
    userNorm = Math.sqrt(userNorm);

    // Cosine(user, trip) — chỉ các token CHUNG đóng góp tử số.
    const cosineMatch = (terms: string[]): { score: number; shared: string[] } => {
      if (userNorm === 0 || terms.length === 0) return { score: 0, shared: [] };
      let dot = 0;
      let tripNorm = 0;
      const shared: string[] = [];
      const seen = new Set<string>();
      for (const tk of terms) {
        if (seen.has(tk)) continue;
        seen.add(tk);
        const w = idf(tk); // TF=1 cho mỗi token đặc trưng của chuyến
        tripNorm += w * w;
        const uw = userVec.get(tk);
        if (uw) {
          dot += uw * w;
          shared.push(tk);
        }
      }
      tripNorm = Math.sqrt(tripNorm);
      if (tripNorm === 0) return { score: 0, shared: [] };
      return { score: dot / (userNorm * tripNorm), shared };
    };

    const raws: Raw[] = candidates.map((trip, ti) => {
      const reasons: string[] = [];

      // MATCH: cosine giữa vector sở thích và vector chuyến (token TF-IDF).
      const { score: matchScore, shared } = cosineMatch(termsPerTrip[ti]);
      const match = +Math.min(1, matchScore).toFixed(4);
      // Lý do gợi ý suy từ các token chung (đẹp cho UI).
      if (shared.some((s) => s.startsWith('cat:')) && trip.category?.label) {
        reasons.push(`Hợp gu ${trip.category.label}`);
      }
      const sharedTags = shared
        .filter((s) => s.startsWith('tag:'))
        .map((s) => s.slice(4));
      if (sharedTags.length) reasons.push(`Tag khớp: ${sharedTags.slice(0, 3).join(', ')}`);
      if (shared.some((s) => s.startsWith('prov:'))) {
        reasons.push(`Đúng nơi bạn thích: ${trip.destination}`);
      }

      // INTERACTION: bão hoà bằng log để lượt xem/click có lợi ích giảm dần —
      // tránh việc mở/bấm 1 chuyến nhiều lần làm điểm tăng vô hạn rồi đè các
      // chuyến khác. favorite/request là ý định mạnh nên cộng thẳng (không lặp).
      const it = interMap.get(trip.id);
      const interRaw = it
        ? Math.log1p(it.views) +
          Math.log1p(it.clicks) * 1.5 +
          (it.favorited ? 2 : 0) +
          (it.requested ? 2.5 : 0)
        : 0;
      if (interRaw > 0) reasons.push('Bạn từng quan tâm chuyến này');

      // HOT: cũng bão hoà bằng log (view/click/request toàn hệ thống tăng không
      // giới hạn). member_count nhỏ nên giữ tuyến tính nhẹ.
      const hotRaw =
        Math.log1p(trip.viewCount ?? 0) +
        Math.log1p(trip.clickCount ?? 0) * 1.5 +
        Math.log1p(trip.requestCount ?? 0) * 2 +
        (trip.memberCount ?? 0) * 0.3;

      return { trip, match, interRaw, hotRaw, reasons };
    });

    // ── Min–max chuẩn hoá interaction & hot về [0,1] ──
    // (MATCH đã là điểm tuyệt đối ở trên, không min–max nữa.)
    const norm = (vals: number[]) => {
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const span = max - min;
      return (v: number) => (span === 0 ? 0 : (v - min) / span);
    };
    const nInter = norm(raws.map((r) => r.interRaw));
    const nHot = norm(raws.map((r) => r.hotRaw));

    const scored = raws.map((r) => {
      const match = +r.match.toFixed(4);
      const interaction = +nInter(r.interRaw).toFixed(4);
      const hot = +nHot(r.hotRaw).toFixed(4);
      const recommendScore = +(0.3 * match + 0.3 * interaction + 0.4 * hot).toFixed(4);
      if (hot >= 0.75) r.reasons.push('Đang hot');
      return {
        ...r.trip,
        recommendScore,
        recommendReasons: [...new Set(r.reasons)],
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
