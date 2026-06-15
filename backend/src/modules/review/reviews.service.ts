import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Review, ReviewTargetType } from './entities/review.entity';
import { Like } from '@/modules/post/entities/like.entity';
import { CreateReviewDto } from './dto/review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private readonly repo: Repository<Review>,
    @InjectRepository(Like) private readonly likes: Repository<Like>,
    private readonly dataSource: DataSource,
  ) {}

  async create(authorId: string, dto: CreateReviewDto): Promise<Review> {
    if (dto.parentId) {
      // Reply: any user can reply unlimited times, no uniqueness rule.
      const parent = await this.repo.findOne({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Parent review not found');
      // Replies of replies are flattened up to the root (mirrors comments).
      const rootId = parent.parentId ?? parent.id;
      return this.repo.save(
        this.repo.create({
          authorId,
          targetType: parent.targetType,
          targetId: parent.targetId,
          parentId: rootId,
          rating: 0,
          comment: dto.comment,
          tags: dto.tags ?? [],
        }),
      );
    }
    // Root review: enforce one rating per (author, target).
    const exists = await this.repo.findOne({
      where: {
        authorId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        parentId: null as unknown as string,
      },
    });
    if (exists) throw new ConflictException('Already reviewed this target');
    return this.repo.save(this.repo.create({ ...dto, authorId }));
  }

  /**
   * List the root reviews for a target, each carrying its replies and a
   * viewer-aware `isLiked`. Sorted newest first; replies are sorted oldest
   * first so the conversation reads top-down.
   */
  async list(
    targetType: ReviewTargetType,
    targetId: string,
    viewerId?: string,
  ) {
    const all = await this.repo.find({
      where: { targetType, targetId },
      order: { createdAt: 'ASC' },
      relations: ['author'],
    });
    const ids = all.map((r) => r.id);
    let likedSet = new Set<string>();
    if (viewerId && ids.length) {
      const liked = await this.likes.find({
        where: ids.map((id) => ({
          userId: viewerId,
          targetType: 'review' as const,
          targetId: id,
        })),
      });
      likedSet = new Set(liked.map((l) => l.targetId));
    }
    const decorate = (r: Review) => ({ ...r, isLiked: likedSet.has(r.id) });
    const roots = all.filter((r) => !r.parentId).map(decorate);
    const repliesByParent = new Map<string, ReturnType<typeof decorate>[]>();
    for (const r of all) {
      if (r.parentId) {
        const arr = repliesByParent.get(r.parentId) ?? [];
        arr.push(decorate(r));
        repliesByParent.set(r.parentId, arr);
      }
    }
    // Newest root first, but keep replies in chronological order.
    return roots
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .map((r) => ({ ...r, replies: repliesByParent.get(r.id) ?? [] }));
  }

  async toggleLike(reviewId: string, userId: string) {
    return this.dataSource.transaction(async (m) => {
      const repo = m.getRepository(Like);
      const rRepo = m.getRepository(Review);
      const review = await rRepo.findOne({ where: { id: reviewId } });
      if (!review) throw new NotFoundException('Review not found');
      const exists = await repo.findOne({
        where: { userId, targetType: 'review', targetId: reviewId },
      });
      if (exists) {
        await repo.delete({ id: exists.id });
        await rRepo.decrement({ id: reviewId }, 'likeCount', 1);
        const fresh = await rRepo.findOneByOrFail({ id: reviewId });
        return { liked: false, likeCount: fresh.likeCount };
      }
      await repo.save(
        repo.create({ userId, targetType: 'review', targetId: reviewId }),
      );
      await rRepo.increment({ id: reviewId }, 'likeCount', 1);
      const fresh = await rRepo.findOneByOrFail({ id: reviewId });
      return { liked: true, likeCount: fresh.likeCount };
    });
  }

  remove(id: string, authorId: string) {
    return this.repo.delete({ id, authorId });
  }
}
