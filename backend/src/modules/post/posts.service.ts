import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';
import { Post, PostVisibility } from './entities/post.entity';
import { Comment } from './entities/comment.entity';
import { Like } from './entities/like.entity';
import { Follow } from '@/modules/user/entities/follow.entity';
import { User } from '@/modules/user/entities/user.entity';
import {
  CreateCommentDto,
  CreatePostDto,
  QueryPostsDto,
  UpdatePostDto,
} from './dto/post.dto';
import { PaginatedResponse } from '@/common/types/api-response.type';
import { NotificationsService } from '@/modules/notification/notifications.service';
import { NotificationType } from '@/modules/notification/entities/notification.entity';
import { SavedService } from '@/modules/saved/saved.service';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post) private readonly posts: Repository<Post>,
    @InjectRepository(Comment) private readonly comments: Repository<Comment>,
    @InjectRepository(Like) private readonly likes: Repository<Like>,
    @InjectRepository(Follow) private readonly follows: Repository<Follow>,
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
    private readonly saved: SavedService,
  ) {}

  /** Decorate a post with viewer-specific fields. */
  private async decorate(
    post: Post,
    viewerId?: string,
    savedSet?: Set<string>,
  ) {
    let isLiked = false;
    let isFollowingAuthor = false;
    let isSaved = false;
    if (viewerId) {
      const [liked, follow] = await Promise.all([
        this.likes.exist({
          where: { userId: viewerId, targetType: 'post', targetId: post.id },
        }),
        this.follows.exist({
          where: { followerId: viewerId, followingId: post.authorId },
        }),
      ]);
      isLiked = liked;
      isFollowingAuthor = follow;
      // `savedSet` is provided when decorating a list (pre-fetched in bulk
      // for the page). For single-detail calls we fall back to a 1-row
      // lookup so the field is still accurate.
      if (savedSet) {
        isSaved = savedSet.has(post.id);
      } else {
        const set = await this.saved.lookupSet(viewerId, 'post', [post.id]);
        isSaved = set.has(post.id);
      }
    }
    return {
      ...post,
      isLiked,
      isFollowingAuthor,
      isSaved,
      isOwner: !!viewerId && post.authorId === viewerId,
    };
  }

  async list(q: QueryPostsDto, viewerId?: string): Promise<PaginatedResponse<unknown>> {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const qb = this.posts.createQueryBuilder('p').leftJoinAndSelect('p.author', 'author');
    if (q.tag) qb.andWhere(':tag = ANY(p.tags)', { tag: q.tag });
    if (q.authorId) qb.andWhere('p.authorId = :a', { a: q.authorId });
    if (q.search) {
      qb.andWhere(
        new Brackets((b) =>
          b
            .where('p.title ILIKE :kw', { kw: `%${q.search}%` })
            .orWhere('p.excerpt ILIKE :kw', { kw: `%${q.search}%` }),
        ),
      );
    }

    if (q.feed === 'following' && viewerId) {
      const ids = await this.follows
        .createQueryBuilder('f')
        .select('f.following_id', 'id')
        .where('f.follower_id = :v', { v: viewerId })
        .getRawMany<{ id: string }>();
      const list = ids.map((r) => r.id);
      if (list.length === 0) return this.empty(page, pageSize);
      qb.andWhere('p.authorId IN (:...ids)', { ids: list });
    }

    // Visibility gate. Public posts are visible to everyone; FRIENDS posts
    // are restricted to the author + their mutuals (people the author follows
    // back). Admins see everything via a separate path.
    //
    // NOTE: posts.author_id is `uuid` while follows.follower_id / following_id
    // are `varchar`. Cast everything to ::text so the same parameter binding
    // is unambiguous to Postgres ("operator does not exist: varchar = uuid").
    if (viewerId) {
      qb.andWhere(
        new Brackets((b) =>
          b
            .where('p.visibility = :pub', { pub: PostVisibility.PUBLIC })
            .orWhere('p.author_id::text = :viewerId', { viewerId })
            .orWhere(
              `p.visibility = :friends AND EXISTS (
                SELECT 1 FROM follows f1
                WHERE f1.follower_id = p.author_id::text AND f1.following_id = :viewerId::text
              ) AND EXISTS (
                SELECT 1 FROM follows f2
                WHERE f2.follower_id = :viewerId::text AND f2.following_id = p.author_id::text
              )`,
              { friends: PostVisibility.FRIENDS, viewerId },
            ),
        ),
      );
    } else {
      // Guests: public only.
      qb.andWhere('p.visibility = :pub', { pub: PostVisibility.PUBLIC });
    }

    if (q.feed === 'trending') {
      qb.orderBy('p.likeCount', 'DESC');
    } else {
      qb.orderBy(
        `p.${q.sortBy ?? 'createdAt'}`,
        (q.sortOrder ?? 'desc').toUpperCase() as 'ASC' | 'DESC',
      );
    }

    const [data, total] = await qb.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    // Bulk-fetch the saved set once for this page so we avoid N+1 queries
    // when decorating each post.
    const savedSet = await this.saved.lookupSet(
      viewerId ?? '',
      'post',
      data.map((p) => p.id),
    );
    const decorated = await Promise.all(
      data.map((p) => this.decorate(p, viewerId, savedSet)),
    );
    return { data: decorated, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async detail(id: string, viewerId?: string) {
    const post = await this.posts.findOne({ where: { id }, relations: ['author'] });
    if (!post) throw new NotFoundException('Post not found');
    if (!(await this.canView(post, viewerId))) {
      throw new ForbiddenException('Bài viết này chỉ hiển thị với bạn bè của tác giả.');
    }
    return this.decorate(post, viewerId);
  }

  /**
   * Tell whether `viewerId` can see `post`. Mirrors the SQL gate in `list()`.
   * Public posts are visible to anyone; friends-only requires the viewer to
   * be the author or a mutual follower.
   */
  private async canView(post: Post, viewerId?: string): Promise<boolean> {
    if (post.visibility === PostVisibility.PUBLIC) return true;
    if (!viewerId) return false;
    if (post.authorId === viewerId) return true;
    // Mutuals: author follows viewer AND viewer follows author.
    const [a, b] = await Promise.all([
      this.follows.exist({
        where: { followerId: post.authorId, followingId: viewerId },
      }),
      this.follows.exist({
        where: { followerId: viewerId, followingId: post.authorId },
      }),
    ]);
    return a && b;
  }

  /**
   * List users who liked a post. Public for any post the viewer can see.
   * Returns paginated user summaries plus a `total` and `isFollowing` flag
   * (for the viewer) so the FE can render a follow button next to each row.
   */
  async listLikers(
    postId: string,
    viewerId: string | undefined,
    page = 1,
    pageSize = 30,
  ) {
    const post = await this.posts.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (!(await this.canView(post, viewerId))) {
      throw new ForbiddenException('Không thể xem danh sách lượt thích của bài viết này.');
    }
    const qb = this.likes
      .createQueryBuilder('l')
      .innerJoin(User, 'u', 'u.id::text = l.user_id')
      .where('l.target_type = :t AND l.target_id = :id', { t: 'post', id: postId })
      .select([
        'u.id AS id',
        'u.name AS name',
        'u.handle AS handle',
        'u.avatar AS avatar',
        'u.bio AS bio',
        'l.created_at AS "likedAt"',
      ])
      .orderBy('l.created_at', 'DESC')
      .offset((page - 1) * pageSize)
      .limit(pageSize);
    const rows = await qb.getRawMany<{
      id: string;
      name: string;
      handle: string | null;
      avatar: string | null;
      bio: string | null;
      likedAt: string;
    }>();
    const total = await this.likes.count({
      where: { targetType: 'post', targetId: postId },
    });

    // Annotate with follow state for the current viewer.
    let followingSet = new Set<string>();
    if (viewerId && rows.length > 0) {
      const ids = rows.map((r) => r.id);
      const follows = await this.follows.find({
        where: ids.map((id) => ({ followerId: viewerId, followingId: id })),
      });
      followingSet = new Set(follows.map((f) => f.followingId));
    }
    return {
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        handle: r.handle,
        avatar: r.avatar,
        bio: r.bio,
        likedAt: r.likedAt,
        isFollowing: followingSet.has(r.id),
        isMe: viewerId === r.id,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /** Internal — strict load without decoration (for internal mutations). */
  private async findRaw(id: string): Promise<Post> {
    const post = await this.posts.findOne({ where: { id }, relations: ['author'] });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  create(authorId: string, dto: CreatePostDto): Promise<Post> {
    return this.posts.save(this.posts.create({ ...dto, authorId }));
  }

  async update(id: string, userId: string, dto: UpdatePostDto): Promise<Post> {
    const post = await this.findRaw(id);
    if (post.authorId !== userId) throw new ForbiddenException('Only author can edit');
    Object.assign(post, dto);
    return this.posts.save(post);
  }

  async remove(id: string, userId: string): Promise<void> {
    const post = await this.findRaw(id);
    if (post.authorId !== userId) throw new ForbiddenException('Only author can delete');
    await this.posts.delete({ id });
  }

  async toggleLike(postId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    const result = await this.dataSource.transaction(async (m) => {
      const repo = m.getRepository(Like);
      const exists = await repo.findOne({
        where: { userId, targetType: 'post', targetId: postId },
      });
      if (exists) {
        await repo.delete({ id: exists.id });
        await m.getRepository(Post).decrement({ id: postId }, 'likeCount', 1);
        const post = await m.getRepository(Post).findOneByOrFail({ id: postId });
        return { liked: false, likeCount: post.likeCount, post };
      }
      await repo.save(repo.create({ userId, targetType: 'post', targetId: postId }));
      await m.getRepository(Post).increment({ id: postId }, 'likeCount', 1);
      const post = await m.getRepository(Post).findOneByOrFail({ id: postId });
      return { liked: true, likeCount: post.likeCount, post };
    });
    if (result.liked && result.post.authorId !== userId) {
      void this.notifications
        .push({
          userId: result.post.authorId,
          actorId: userId,
          type: NotificationType.LIKE,
          title: 'Có người vừa thích bài viết của bạn',
          preview: result.post.title,
          ctaLabel: 'Xem bài',
          ctaHref: `/social#${result.post.id}`,
          image: result.post.image,
        })
        .catch(() => undefined);
    }
    return { liked: result.liked, likeCount: result.likeCount };
  }

  async addComment(postId: string, authorId: string, dto: CreateCommentDto) {
    const post = await this.findRaw(postId);
    // Enforce max 2-level nesting (root -> reply, reply-of-reply not allowed).
    if (dto.parentId) {
      const parent = await this.comments.findOne({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Parent comment not found');
      if (parent.parentId) {
        // Treat as a flat reply: keep parent at the root level.
        dto = { ...dto, parentId: parent.parentId };
      }
    }
    const comment = await this.comments.save(
      this.comments.create({ ...dto, postId: post.id, authorId }),
    );
    await this.posts.increment({ id: post.id }, 'commentCount', 1);
    if (post.authorId !== authorId) {
      void this.notifications
        .push({
          userId: post.authorId,
          actorId: authorId,
          type: NotificationType.COMMENT,
          title: 'Bình luận mới trên bài của bạn',
          preview: dto.content.slice(0, 200),
          ctaLabel: 'Trả lời',
          ctaHref: `/social#${post.id}`,
          image: post.image,
        })
        .catch(() => undefined);
    }
    // Re-fetch with author relation for consistent response shape.
    const full = await this.comments.findOne({
      where: { id: comment.id },
      relations: ['author'],
    });
    // New comment -> the author hasn't liked themselves; expose isLiked=false
    // so the FE shape stays consistent with listComments().
    return { ...(full ?? comment), isLiked: false };
  }

  async listComments(postId: string, viewerId?: string) {
    const rows = await this.comments.find({
      where: { postId },
      relations: ['author'],
      order: { createdAt: 'ASC' },
    });
    if (!viewerId || rows.length === 0) {
      return rows.map((c) => ({ ...c, isLiked: false }));
    }
    const ids = rows.map((c) => c.id);
    const liked = await this.likes.find({
      where: ids.map((id) => ({
        userId: viewerId,
        targetType: 'comment' as const,
        targetId: id,
      })),
    });
    const likedSet = new Set(liked.map((l) => l.targetId));
    return rows.map((c) => ({ ...c, isLiked: likedSet.has(c.id) }));
  }

  /**
   * Toggle a like on a comment. Mirrors `toggleLike` for posts but with
   * targetType='comment'. Increments / decrements `likeCount` on the comment
   * row and triggers a notification to the comment author on the first like
   * (skip self-likes, skip un-likes).
   */
  async toggleCommentLike(
    commentId: string,
    userId: string,
  ): Promise<{ liked: boolean; likeCount: number }> {
    const result = await this.dataSource.transaction(async (m) => {
      const repo = m.getRepository(Like);
      const cRepo = m.getRepository(Comment);
      const exists = await repo.findOne({
        where: { userId, targetType: 'comment', targetId: commentId },
      });
      if (exists) {
        await repo.delete({ id: exists.id });
        await cRepo.decrement({ id: commentId }, 'likeCount', 1);
        const c = await cRepo.findOneByOrFail({ id: commentId });
        return { liked: false, likeCount: c.likeCount, comment: c };
      }
      await repo.save(
        repo.create({ userId, targetType: 'comment', targetId: commentId }),
      );
      await cRepo.increment({ id: commentId }, 'likeCount', 1);
      const c = await cRepo.findOneByOrFail({ id: commentId });
      return { liked: true, likeCount: c.likeCount, comment: c };
    });
    if (result.liked && result.comment.authorId !== userId) {
      void this.notifications
        .push({
          userId: result.comment.authorId,
          actorId: userId,
          type: NotificationType.LIKE,
          title: 'Có người vừa thích bình luận của bạn',
          preview: result.comment.content.slice(0, 200),
          ctaLabel: 'Xem',
          ctaHref: `/social#${result.comment.postId}`,
        })
        .catch(() => undefined);
    }
    return { liked: result.liked, likeCount: result.likeCount };
  }

  async removeComment(id: string, userId: string): Promise<void> {
    const c = await this.comments.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Comment not found');
    if (c.authorId !== userId) throw new ForbiddenException('Only author can delete');
    await this.dataSource.transaction(async (m) => {
      await m.getRepository(Comment).delete({ id });
      await m.getRepository(Post).decrement({ id: c.postId }, 'commentCount', 1);
    });
  }

  private empty<T>(page: number, pageSize: number): PaginatedResponse<T> {
    return { data: [], total: 0, page, pageSize, totalPages: 0 };
  }
}
