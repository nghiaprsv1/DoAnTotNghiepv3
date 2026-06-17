import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Follow } from './entities/follow.entity';
import { UserPreference } from './entities/user-preference.entity';
import { Post } from '@/modules/post/entities/post.entity';
import { NotificationsService } from '@/modules/notification/notifications.service';
import { NotificationType } from '@/modules/notification/entities/notification.entity';
import { UpsertUserPreferenceDto } from './dto/upsert-user-preference.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Follow) private readonly follows: Repository<Follow>,
    @InjectRepository(Post) private readonly posts: Repository<Post>,
    @InjectRepository(UserPreference)
    private readonly preferences: Repository<UserPreference>,
    private readonly notifications: NotificationsService,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  async getProfile(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /** Public profile by id, with counters. Owner sees private fields too. */
  async getPublicProfile(id: string, viewerId?: string) {
    const user = await this.getProfile(id);
    const [followersCount, followingCount, isFollowing, postsCount] = await Promise.all([
      this.follows.count({ where: { followingId: id } }),
      this.follows.count({ where: { followerId: id } }),
      viewerId
        ? this.follows.exist({ where: { followerId: viewerId, followingId: id } })
        : Promise.resolve(false),
      this.posts.count({ where: { authorId: id } }),
    ]);
    const isOwner = viewerId === id;
    return {
      id: user.id,
      name: user.name,
      handle: user.handle,
      avatar: user.avatar,
      cover: user.cover,
      bio: user.bio,
      location: user.location,
      socialLinks: user.socialLinks ?? null,
      preferences: user.preferences ?? null,
      role: user.role,
      verified: user.verified,
      joinedAt: user.createdAt,
      // Private fields — only the owner sees these.
      ...(isOwner ? { email: user.email, phone: user.phone } : {}),
      postsCount,
      followersCount,
      followingCount,
      isFollowing,
    };
  }

  async update(
    id: string,
    patch: Partial<
      Pick<
        User,
        | 'name'
        | 'handle'
        | 'avatar'
        | 'cover'
        | 'bio'
        | 'location'
        | 'phone'
        | 'socialLinks'
        | 'preferences'
      >
    >,
  ): Promise<User> {
    await this.users.update(id, patch);
    return this.getProfile(id);
  }

  /* ──────────────── Structured AI-personalization preferences ──────────────── */

  /**
   * The caller's structured preference profile from the dedicated
   * `user_preferences` table. Returns an empty (unsaved) shell when the user
   * has never set any — callers can treat it as "no preferences yet".
   */
  async getPreferences(userId: string): Promise<UserPreference> {
    const existing = await this.preferences.findOne({ where: { userId } });
    if (existing) return existing;
    return this.preferences.create({
      userId,
      categories: [],
      interests: [],
      provinces: [],
    });
  }

  /** Create or update the caller's structured preference profile. */
  async upsertPreferences(
    userId: string,
    dto: UpsertUserPreferenceDto,
  ): Promise<UserPreference> {
    const existing = await this.preferences.findOne({ where: { userId } });
    const row = existing
      ? Object.assign(existing, dto)
      : this.preferences.create({
          userId,
          categories: dto.categories ?? [],
          interests: dto.interests ?? [],
          provinces: dto.provinces ?? [],
          budgetTier: dto.budgetTier,
        });
    return this.preferences.save(row);
  }

  async follow(followerId: string, followingId: string): Promise<void> {
    if (followerId === followingId) return;
    const exists = await this.follows.findOne({
      where: { followerId, followingId },
    });
    if (exists) return;
    await this.follows.save(this.follows.create({ followerId, followingId }));
    const actor = await this.users.findOne({ where: { id: followerId } });
    void this.notifications
      .push({
        userId: followingId,
        actorId: followerId,
        type: NotificationType.FOLLOW,
        title: 'Có người vừa theo dõi bạn',
        preview: actor?.name ?? 'Người dùng mới',
        ctaLabel: 'Xem trang',
        ctaHref: `/users/${followerId}`,
        image: actor?.avatar,
      })
      .catch(() => undefined);
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    await this.follows.delete({ followerId, followingId });
  }

  listFollowers(userId: string) {
    return this.follows.find({
      where: { followingId: userId },
      relations: ['follower'],
      order: { createdAt: 'DESC' },
    });
  }

  listFollowing(userId: string) {
    return this.follows.find({
      where: { followerId: userId },
      relations: ['following'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Free-text search over name / handle / email. Excludes the caller from
   * results and limits to 20 by default — used by the FE search UI.
   */
  async search(q: string, viewerId?: string, limit = 20) {
    const term = q.trim();
    if (!term) return [];
    const cap = Math.min(Math.max(limit, 1), 50);
    const matches = await this.users
      .createQueryBuilder('u')
      .where(viewerId ? 'u.id <> :viewerId' : '1=1', { viewerId })
      .andWhere('(u.name ILIKE :q OR u.handle ILIKE :q OR u.email ILIKE :q)', {
        q: `%${term}%`,
      })
      .andWhere('u.is_locked = false')
      .orderBy('u.name', 'ASC')
      .limit(cap)
      .getMany();
    return matches.map((u) => ({
      id: u.id,
      name: u.name,
      handle: u.handle,
      avatar: u.avatar,
      role: u.role,
      verified: u.verified,
      bio: u.bio,
      location: u.location,
    }));
  }
}
