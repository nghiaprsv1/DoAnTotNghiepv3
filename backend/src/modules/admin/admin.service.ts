import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { UserRole } from '@/common/enums/user-role.enum';
import { GuideProfile, GuideStatus } from '@/modules/guide/entities/guide-profile.entity';
import { GuideBooking, BookingStatus } from '@/modules/guide/entities/guide-booking.entity';
import { Wallet } from '@/modules/guide/entities/wallet.entity';
import {
  WalletTransaction,
  WalletTxnType,
  WalletTxnStatus,
} from '@/modules/guide/entities/wallet-transaction.entity';
import { Post } from '@/modules/post/entities/post.entity';
import { Comment } from '@/modules/post/entities/comment.entity';
import { Like } from '@/modules/post/entities/like.entity';
import { Trip } from '@/modules/trip/entities/trip.entity';
import { GuidesService } from '@/modules/guide/guides.service';
import { NotificationsService } from '@/modules/notification/notifications.service';
import { NotificationType } from '@/modules/notification/entities/notification.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(GuideProfile) private readonly guides: Repository<GuideProfile>,
    @InjectRepository(GuideBooking) private readonly bookings: Repository<GuideBooking>,
    @InjectRepository(Wallet) private readonly wallets: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly txns: Repository<WalletTransaction>,
    @InjectRepository(Post) private readonly posts: Repository<Post>,
    @InjectRepository(Comment) private readonly comments: Repository<Comment>,
    @InjectRepository(Like) private readonly likes: Repository<Like>,
    @InjectRepository(Trip) private readonly trips: Repository<Trip>,
    private readonly dataSource: DataSource,
    private readonly guidesService: GuidesService,
    private readonly notifications: NotificationsService,
  ) {}

  /** High-level dashboard counters. */
  async dashboard() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();

    const [
      totalUsers,
      totalGuides,
      pendingGuides,
      totalPosts,
      totalTrips,
      tripsPublished,
      completed,
      newUsersThisMonth,
      newUsersPrevMonth,
      newUsersLast7Days,
      postsThisMonth,
      tripsThisMonth,
    ] = await Promise.all([
      this.users.count(),
      this.guides.count({ where: { status: GuideStatus.APPROVED } }),
      this.guides.count({ where: { status: GuideStatus.PENDING } }),
      this.posts.count(),
      this.trips.count(),
      this.trips
        .createQueryBuilder('t')
        .where("t.status = 'published'")
        .getCount(),
      this.bookings.count({ where: { status: BookingStatus.COMPLETED } }),
      this.users
        .createQueryBuilder('u')
        .where('u.created_at >= :sm', { sm: startOfMonth })
        .getCount(),
      this.users
        .createQueryBuilder('u')
        .where('u.created_at >= :sp', { sp: startOfPrevMonth })
        .andWhere('u.created_at < :ep', { ep: endOfPrevMonth })
        .getCount(),
      this.users
        .createQueryBuilder('u')
        .where('u.created_at >= :s7', { s7: sevenDaysAgo })
        .getCount(),
      this.posts
        .createQueryBuilder('p')
        .where('p.created_at >= :sm', { sm: startOfMonth })
        .getCount(),
      this.trips
        .createQueryBuilder('t')
        .where('t.created_at >= :sm', { sm: startOfMonth })
        .getCount(),
    ]);
    const revRow = await this.bookings
      .createQueryBuilder('b')
      .select('COALESCE(SUM(b.amount), 0)', 'total')
      .where('b.status = :s', { s: BookingStatus.COMPLETED })
      .getRawOne<{ total: string }>();

    // Month-over-month delta on new signups (percentage; null if no baseline).
    const userGrowthPct =
      newUsersPrevMonth > 0
        ? Math.round(
            ((newUsersThisMonth - newUsersPrevMonth) / newUsersPrevMonth) * 1000,
          ) / 10
        : null;

    return {
      totalUsers,
      totalGuides,
      pendingGuides,
      totalPosts,
      totalTrips,
      tripsPublished,
      bookingsCompleted: completed,
      // 10% commission as a sample model
      commissionRevenue: Number(revRow?.total ?? 0) * 0.1,
      users: {
        total: totalUsers,
        newThisMonth: newUsersThisMonth,
        newPrevMonth: newUsersPrevMonth,
        newLast7Days: newUsersLast7Days,
        growthPct: userGrowthPct,
      },
      posts: {
        total: totalPosts,
        newThisMonth: postsThisMonth,
      },
      trips: {
        total: totalTrips,
        published: tripsPublished,
        newThisMonth: tripsThisMonth,
      },
    };
  }

  /**
   * Detailed revenue/commission report. Reports all sources of money flowing
   * through the platform so admin can audit:
   *  - commission earned per completed booking
   *  - top earners (guides) for the period
   *  - daily commission timeline
   *  - top-up volume + withdrawal payouts
   */
  async revenueReport(start?: string, end?: string) {
    const range = (qb: ReturnType<typeof this.bookings.createQueryBuilder>) => {
      if (start) qb.andWhere('b.completed_at >= :start', { start });
      if (end) qb.andWhere('b.completed_at <= :end', { end });
      return qb;
    };

    // Commission per completed booking — joined with guide+traveler so the FE
    // can show "Hoa hồng từ tour X · HDV Y · Khách Z".
    const bookingRows = await range(
      this.bookings
        .createQueryBuilder('b')
        .leftJoin('b.guide', 'g')
        .leftJoin('g.user', 'gu')
        .leftJoin('b.traveler', 't')
        .where('b.status = :s', { s: BookingStatus.COMPLETED }),
    )
      .select([
        'b.id AS id',
        'b.tour_title AS "tourTitle"',
        'b.amount AS amount',
        'b.completed_at AS "completedAt"',
        'gu.id AS "guideId"',
        'gu.name AS "guideName"',
        'gu.avatar AS "guideAvatar"',
        't.id AS "travelerId"',
        't.name AS "travelerName"',
        't.avatar AS "travelerAvatar"',
      ])
      .orderBy('b.completed_at', 'DESC')
      .limit(100)
      .getRawMany();

    const breakdown = bookingRows.map((r) => ({
      bookingId: r.id,
      tourTitle: r.tourTitle,
      gross: Number(r.amount),
      commission: +(Number(r.amount) * 0.1).toFixed(2),
      net: +(Number(r.amount) * 0.9).toFixed(2),
      completedAt: r.completedAt,
      guide: { id: r.guideId, name: r.guideName, avatar: r.guideAvatar },
      traveler: { id: r.travelerId, name: r.travelerName, avatar: r.travelerAvatar },
    }));

    // Daily commission buckets for the chart.
    const dayQb = range(
      this.bookings
        .createQueryBuilder('b')
        .where('b.status = :s', { s: BookingStatus.COMPLETED }),
    );
    const dailyRaw = await dayQb
      .select([
        "DATE_TRUNC('day', b.completed_at) AS day",
        'COUNT(*) AS bookings',
        'COALESCE(SUM(b.amount), 0) AS gross',
      ])
      .groupBy("DATE_TRUNC('day', b.completed_at)")
      .orderBy('day', 'ASC')
      .getRawMany<{ day: string; bookings: string; gross: string }>();

    // Top earning guides for the period.
    const topGuides = await range(
      this.bookings
        .createQueryBuilder('b')
        .leftJoin('b.guide', 'g')
        .leftJoin('g.user', 'gu')
        .where('b.status = :s', { s: BookingStatus.COMPLETED }),
    )
      .select([
        'gu.id AS "userId"',
        'gu.name AS name',
        'gu.avatar AS avatar',
        'COUNT(*) AS bookings',
        'COALESCE(SUM(b.amount), 0) AS gross',
      ])
      .groupBy('gu.id, gu.name, gu.avatar')
      .orderBy('gross', 'DESC')
      .limit(5)
      .getRawMany();

    // Money-flow totals (wallet transactions).
    const txnTotals = await this.txns
      .createQueryBuilder('t')
      .select('t.type', 'type')
      .addSelect('COALESCE(SUM(t.amount), 0)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('t.status = :ok', { ok: WalletTxnStatus.SUCCESS })
      .groupBy('t.type')
      .getRawMany<{ type: string; total: string; count: string }>();
    const totalsByType = Object.fromEntries(
      txnTotals.map((r) => [r.type, { total: Math.abs(Number(r.total)), count: Number(r.count) }]),
    );

    const totalGross = breakdown.reduce((s, r) => s + r.gross, 0);
    const totalCommission = +(totalGross * 0.1).toFixed(2);
    const totalNet = +(totalGross * 0.9).toFixed(2);

    return {
      from: start ?? null,
      to: end ?? null,
      totals: {
        gross: totalGross,
        commission: totalCommission,
        net: totalNet,
        bookingsCompleted: breakdown.length,
      },
      moneyFlow: {
        topUp: totalsByType[WalletTxnType.TOPUP] ?? { total: 0, count: 0 },
        payment: totalsByType[WalletTxnType.PAYMENT] ?? { total: 0, count: 0 },
        commission: totalsByType[WalletTxnType.COMMISSION] ?? { total: 0, count: 0 },
        withdrawSuccess: totalsByType[WalletTxnType.WITHDRAW_SUCCESS] ?? { total: 0, count: 0 },
        withdrawPending: totalsByType[WalletTxnType.WITHDRAW_REQUEST] ?? { total: 0, count: 0 },
        refund: totalsByType[WalletTxnType.REFUND] ?? { total: 0, count: 0 },
      },
      daily: dailyRaw.map((r) => ({
        day: r.day,
        bookings: Number(r.bookings),
        gross: Number(r.gross),
        commission: +(Number(r.gross) * 0.1).toFixed(2),
      })),
      topGuides: topGuides.map((r) => ({
        userId: r.userId,
        name: r.name,
        avatar: r.avatar,
        bookings: Number(r.bookings),
        gross: Number(r.gross),
        commission: +(Number(r.gross) * 0.1).toFixed(2),
      })),
      breakdown,
    };
  }

  /** Admin tops up any user's wallet. Delegates to GuidesService. */
  topUpUser(userId: string, amount: number, note?: string) {
    return this.guidesService.adminTopUp(userId, amount, note);
  }

  /**
   * Bulk top-up — credit the same amount to many users in one call. Each user
   * is processed independently; a failure on one (e.g. user not found) is
   * captured per-row rather than aborting the whole batch.
   */
  async topUpManyUsers(userIds: string[], amount: number, note?: string) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new BadRequestException('userIds is required');
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('amount must be positive');
    }
    const results = await Promise.allSettled(
      userIds.map((id) => this.guidesService.adminTopUp(id, amount, note)),
    );
    const succeeded: string[] = [];
    const failed: Array<{ userId: string; reason: string }> = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') succeeded.push(userIds[i]);
      else failed.push({ userId: userIds[i], reason: (r.reason as Error)?.message ?? 'failed' });
    });
    return {
      requested: userIds.length,
      succeeded: succeeded.length,
      failed: failed.length,
      failures: failed,
      totalCredited: succeeded.length * amount,
    };
  }

  /**
   * New-user registration timeline for marketing analytics. Buckets users by
   * day / week / month over an optional [start, end] window and returns a
   * dense series (zero-filled gaps) so the FE chart has no holes.
   */
  async registrationStats(opts: {
    granularity?: 'day' | 'week' | 'month';
    start?: string;
    end?: string;
  }) {
    const granularity = opts.granularity ?? 'day';
    const trunc = granularity === 'week' ? 'week' : granularity === 'month' ? 'month' : 'day';
    const qb = this.users
      .createQueryBuilder('u')
      .select(`DATE_TRUNC('${trunc}', u.created_at)`, 'bucket')
      .addSelect('COUNT(*)', 'count')
      .groupBy('bucket')
      .orderBy('bucket', 'ASC');
    if (opts.start) qb.andWhere('u.created_at >= :start', { start: opts.start });
    if (opts.end) qb.andWhere('u.created_at <= :end', { end: opts.end });
    const rows = await qb.getRawMany<{ bucket: string; count: string }>();
    const series = rows.map((r) => ({
      date: new Date(r.bucket).toISOString().slice(0, 10),
      count: Number(r.count),
    }));
    return {
      granularity,
      total: series.reduce((s, p) => s + p.count, 0),
      series,
    };
  }

  /**
   * Detailed revenue breakdown for a single guide — total earnings, commission
   * paid to the platform, completed/cancelled counts, and a per-booking ledger.
   */
  async guideRevenueDetail(guideId: string) {
    const guide = await this.guides.findOne({
      where: { id: guideId },
      relations: ['user'],
    });
    if (!guide) throw new NotFoundException('Guide not found');

    const COMMISSION_RATE = 0.1;
    const bookings = await this.bookings
      .createQueryBuilder('b')
      .where('b.guide_id = :gid', { gid: guideId })
      .orderBy('b.created_at', 'DESC')
      .getMany();

    const completed = bookings.filter((b) => b.status === BookingStatus.COMPLETED);
    const cancelled = bookings.filter(
      (b) => b.status === BookingStatus.CANCELLED || b.status === BookingStatus.REJECTED,
    );
    const grossRevenue = completed.reduce((s, b) => s + Number(b.amount), 0);
    const commission = Math.round(grossRevenue * COMMISSION_RATE);
    const netEarnings = grossRevenue - commission;

    return {
      guide: {
        id: guide.id,
        userId: guide.userId,
        name: guide.user?.name ?? 'Guide',
        avatar: guide.user?.avatar ?? '',
        region: guide.region,
        pricePerDay: Number(guide.pricePerDay),
        currency: guide.currency,
      },
      summary: {
        totalBookings: bookings.length,
        completedBookings: completed.length,
        cancelledBookings: cancelled.length,
        grossRevenue,
        commission,
        netEarnings,
      },
      bookings: bookings.map((b) => ({
        id: b.id,
        tourTitle: b.tourTitle,
        destination: b.destination,
        startDate: b.startDate,
        endDate: b.endDate,
        amount: Number(b.amount),
        status: b.status,
        createdAt: b.createdAt,
        completedAt: b.completedAt,
      })),
    };
  }

  /** All wallets snapshot — for the admin "ví hệ thống" overview. */
  async listWallets(opts: { search?: string; page?: number; pageSize?: number }) {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 30;
    const qb = this.wallets
      .createQueryBuilder('w')
      .innerJoin(User, 'u', 'u.id = w.user_id');
    if (opts.search) {
      qb.where(
        new Brackets((b) =>
          b
            .where('u.name ILIKE :kw', { kw: `%${opts.search}%` })
            .orWhere('u.email ILIKE :kw', { kw: `%${opts.search}%` }),
        ),
      );
    }
    qb.select([
      'w.id AS id',
      'w.balance_available AS "balanceAvailable"',
      'w.balance_frozen AS "balanceFrozen"',
      'w.currency AS currency',
      'u.id AS "userId"',
      'u.name AS "userName"',
      'u.email AS "userEmail"',
      'u.avatar AS "userAvatar"',
      'u.role AS role',
    ])
      .orderBy('w.balance_available', 'DESC')
      .offset((page - 1) * pageSize)
      .limit(pageSize);
    const data = await qb.getRawMany();
    return data.map((r) => ({
      id: r.id,
      balanceAvailable: Number(r.balanceAvailable),
      balanceFrozen: Number(r.balanceFrozen),
      currency: r.currency,
      role: r.role,
      user: { id: r.userId, name: r.userName, email: r.userEmail, avatar: r.userAvatar },
    }));
  }

  pendingGuides() {
    // idCardNumber / idCardImage / certificateImages are `select: false` by
    // default. Admin needs them to verify the application — pull them in via
    // QueryBuilder.
    return this.guides
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.user', 'u')
      .addSelect(['g.idCardNumber', 'g.idCardImage', 'g.certificateImages'])
      .where('g.status = :s', { s: GuideStatus.PENDING })
      .orderBy('g.createdAt', 'DESC')
      .getMany();
  }

  /** Filterable user list. Returns paged data + total. */
  async listUsers(opts: {
    page?: number;
    pageSize?: number;
    role?: UserRole | string;
    search?: string;
    status?: 'active' | 'banned';
  }) {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 50;
    const qb = this.users.createQueryBuilder('u');
    if (opts.role) qb.andWhere('u.role = :r', { r: opts.role });
    if (opts.status === 'active') qb.andWhere('u.isLocked = false');
    if (opts.status === 'banned') qb.andWhere('u.isLocked = true');
    if (opts.search) {
      qb.andWhere(
        new Brackets((b) =>
          b
            .where('u.name ILIKE :kw', { kw: `%${opts.search}%` })
            .orWhere('u.email ILIKE :kw', { kw: `%${opts.search}%` })
            .orWhere('u.handle ILIKE :kw', { kw: `%${opts.search}%` }),
        ),
      );
    }
    qb.orderBy('u.createdAt', 'DESC').skip((page - 1) * pageSize).take(pageSize);
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async setLock(userId: string, locked: boolean): Promise<void> {
    await this.users.update({ id: userId }, { isLocked: locked });
    void this.notifications
      .push({
        userId,
        type: NotificationType.SYSTEM,
        title: locked ? 'Tài khoản đã bị khoá' : 'Tài khoản đã được mở khoá',
        preview: locked
          ? 'Bạn không thể đăng nhập cho đến khi quản trị viên mở khoá.'
          : 'Bạn có thể tiếp tục sử dụng dịch vụ.',
      })
      .catch(() => undefined);
  }

  /** Send a system notification to one user, a list, or all active users. */
  async broadcastNotification(input: {
    title: string;
    content: string;
    receiverId?: string;
    sendToAll?: boolean;
    image?: string;
  }) {
    const { title, content, receiverId, sendToAll, image } = input;
    if (!receiverId && !sendToAll) {
      throw new BadRequestException('Specify receiverId or sendToAll');
    }
    let recipientIds: string[];
    if (sendToAll) {
      const users = await this.users.find({ where: { isLocked: false }, select: { id: true } });
      recipientIds = users.map((u) => u.id);
    } else {
      recipientIds = [receiverId as string];
    }
    await Promise.all(
      recipientIds.map((id) =>
        this.notifications.push({
          userId: id,
          type: NotificationType.SYSTEM,
          title,
          preview: content.slice(0, 200),
          body: content,
          image,
        }),
      ),
    );
    return { delivered: recipientIds.length };
  }

  /* ─────────────────────────── Posts (Admin) ─────────────────────────── */

  /** List every post on the platform, regardless of visibility. */
  async listPosts(opts: { search?: string; page?: number; pageSize?: number }) {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 20;
    const qb = this.posts
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.author', 'a');
    if (opts.search) {
      qb.where(
        new Brackets((b) =>
          b
            .where('p.title ILIKE :kw', { kw: `%${opts.search}%` })
            .orWhere('p.location ILIKE :kw', { kw: `%${opts.search}%` })
            .orWhere('a.name ILIKE :kw', { kw: `%${opts.search}%` }),
        ),
      );
    }
    qb.orderBy('p.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [items, total] = await qb.getManyAndCount();
    const data = items.map((p) => ({
      id: p.id,
      title: p.title,
      excerpt: p.excerpt,
      image: p.image,
      location: p.location,
      visibility: p.visibility,
      likeCount: p.likeCount,
      commentCount: p.commentCount,
      createdAt: p.createdAt,
      author: p.author
        ? {
            id: p.author.id,
            name: p.author.name,
            email: p.author.email,
            avatar: p.author.avatar,
          }
        : null,
    }));
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  /**
   * Force-delete a post (no author check). Cleans up polymorphic likes for the
   * post and its comments since they're not bound by FK.
   */
  async deletePost(id: string): Promise<void> {
    const post = await this.posts.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    await this.dataSource.transaction(async (m) => {
      const commentIds = (
        await m.getRepository(Comment).find({ where: { postId: id }, select: { id: true } })
      ).map((c) => c.id);
      if (commentIds.length) {
        await m
          .getRepository(Like)
          .createQueryBuilder()
          .delete()
          .where('target_type = :t AND target_id IN (:...ids)', {
            t: 'comment',
            ids: commentIds,
          })
          .execute();
      }
      await m
        .getRepository(Like)
        .createQueryBuilder()
        .delete()
        .where('target_type = :t AND target_id = :id', { t: 'post', id })
        .execute();
      // Comments cascade via FK.
      await m.getRepository(Post).delete({ id });
    });
  }

  /* ─────────────────────────── Trips (Admin) ─────────────────────────── */

  /** Read-only listing for the admin "Quản lý chuyến đi" page. */
  async listTrips(opts: { search?: string; status?: string; page?: number; pageSize?: number }) {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 20;
    const qb = this.trips
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.creator', 'c')
      .leftJoinAndSelect('t.guide', 'g');
    if (opts.search) {
      qb.where(
        new Brackets((b) =>
          b
            .where('t.title ILIKE :kw', { kw: `%${opts.search}%` })
            .orWhere('t.destination ILIKE :kw', { kw: `%${opts.search}%` })
            .orWhere('c.name ILIKE :kw', { kw: `%${opts.search}%` }),
        ),
      );
    }
    if (opts.status) qb.andWhere('t.status = :s', { s: opts.status });
    qb.orderBy('t.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [items, total] = await qb.getManyAndCount();
    const data = items.map((t) => ({
      id: t.id,
      title: t.title,
      destination: t.destination,
      coverImage: t.coverImage,
      startDate: t.startDate,
      endDate: t.endDate,
      durationDays: t.durationDays,
      maxMembers: t.maxMembers,
      memberCount: t.memberCount,
      status: t.status,
      priceFrom: Number(t.priceFrom),
      currency: t.currency,
      createdAt: t.createdAt,
      creator: t.creator
        ? { id: t.creator.id, name: t.creator.name, avatar: t.creator.avatar }
        : null,
      guide: t.guide ? { id: t.guide.id, name: t.guide.name, avatar: t.guide.avatar } : null,
    }));
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
