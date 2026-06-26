import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Review, ReviewTargetType } from './entities/review.entity';
import { Like } from '@/modules/post/entities/like.entity';
import { GuideProfile } from '@/modules/guide/entities/guide-profile.entity';
import { Trip } from '@/modules/trip/entities/trip.entity';
import { Place } from '@/modules/place/entities/place.entity';
import { NotificationsService } from '@/modules/notification/notifications.service';
import { NotificationType } from '@/modules/notification/entities/notification.entity';
import { CreateReviewDto } from './dto/review.dto';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectRepository(Review) private readonly repo: Repository<Review>,
    @InjectRepository(Like) private readonly likes: Repository<Like>,
    @InjectRepository(GuideProfile)
    private readonly guides: Repository<GuideProfile>,
    @InjectRepository(Trip) private readonly trips: Repository<Trip>,
    @InjectRepository(Place) private readonly places: Repository<Place>,
    private readonly notifications: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  async create(authorId: string, dto: CreateReviewDto): Promise<Review> {
    if (dto.parentId) {
      // Reply: any user can reply unlimited times, no uniqueness rule.
      const parent = await this.repo.findOne({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Parent review not found');
      // Replies of replies are flattened up to the root (mirrors comments).
      const rootId = parent.parentId ?? parent.id;
      const reply = await this.repo.save(
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
      // Báo cho TÁC GIẢ review gốc rằng có người (thường là HDV) đã phản hồi.
      // Best-effort, không chặn việc lưu reply.
      void this.notifyReplyToAuthor(parent, reply).catch((e) =>
        this.logger.warn(`Không gửi được thông báo phản hồi: ${(e as Error).message}`),
      );
      return reply;
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
    const saved = await this.repo.save(this.repo.create({ ...dto, authorId }));
    // Cập nhật lại rating/review_count THẬT trên đối tượng (place/trip) từ bảng
    // reviews — để con số hiển thị khớp thực tế, không phải số seed hardcode.
    await this.recalcTarget(saved.targetType, saved.targetId).catch((e) =>
      this.logger.warn(`Không tính lại rating: ${(e as Error).message}`),
    );
    // Best-effort: thông báo cho chủ đối tượng được đánh giá. Không để lỗi
    // notification làm hỏng việc lưu review.
    void this.notifyTargetOwner(saved).catch((e) =>
      this.logger.warn(`Không gửi được thông báo đánh giá: ${(e as Error).message}`),
    );
    return saved;
  }

  /**
   * Tính lại rating trung bình + số lượt đánh giá THẬT của 1 đối tượng từ bảng
   * `reviews` (chỉ review gốc, rating > 0) rồi ghi vào cột denormalized của
   * place/trip. Guide tính live qua GuidesService nên bỏ qua ở đây.
   */
  async recalcTarget(targetType: ReviewTargetType, targetId: string): Promise<void> {
    if (
      targetType !== ReviewTargetType.PLACE &&
      targetType !== ReviewTargetType.TRIP
    ) {
      return;
    }
    const row = await this.repo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(*)', 'cnt')
      .where('r.target_type = :t', { t: targetType })
      .andWhere('r.target_id = :id', { id: targetId })
      .andWhere('r.parent_id IS NULL')
      .andWhere('r.rating > 0')
      .getRawOne<{ avg: string | null; cnt: string }>();

    const avg = row?.avg ? Math.round(Number(row.avg) * 100) / 100 : 0;
    const cnt = Number(row?.cnt ?? 0);

    if (targetType === ReviewTargetType.PLACE) {
      await this.places.update({ id: targetId }, { rating: avg, reviewCount: cnt });
    } else {
      // Trip entity chỉ có cột rating (không có review_count).
      await this.trips.update({ id: targetId }, { rating: avg });
    }
  }

  /**
   * Báo cho chủ sở hữu đối tượng vừa bị/được đánh giá (HDV hoặc người tạo
   * chuyến). Bỏ qua nếu người tự đánh giá chính mình, hoặc target không có chủ
   * rõ ràng (place không thuộc về user nào).
   */
  private async notifyTargetOwner(review: Review): Promise<void> {
    let ownerId: string | undefined;
    let title = 'Bạn có đánh giá mới';
    let ctaHref: string | undefined;

    if (review.targetType === ReviewTargetType.GUIDE) {
      const profile = await this.guides.findOne({ where: { id: review.targetId } });
      ownerId = profile?.userId;
      title = `Bạn nhận được đánh giá ${review.rating}★`;
      ctaHref = '/guide/dashboard';
    } else if (review.targetType === ReviewTargetType.TRIP) {
      const trip = await this.trips.findOne({ where: { id: review.targetId } });
      ownerId = trip?.creatorId;
      title = `Chuyến đi của bạn có đánh giá ${review.rating}★`;
      ctaHref = `/trips/${review.targetId}`;
    } else {
      // place / member: chưa có chủ sở hữu rõ ràng để gửi → bỏ qua.
      return;
    }

    if (!ownerId || ownerId === review.authorId) return;

    const preview = review.comment?.trim()
      ? review.comment.trim().slice(0, 140)
      : `Bạn vừa nhận được ${review.rating} sao.`;
    await this.notifications.push({
      userId: ownerId,
      actorId: review.authorId,
      type: NotificationType.REVIEW_NEW,
      title,
      preview,
      ctaLabel: 'Xem đánh giá',
      ctaHref,
    });
  }

  /**
   * Báo cho tác giả review gốc khi có người phản hồi đánh giá của họ. Dùng cho
   * luồng HDV trả lời đánh giá của khách. Bỏ qua nếu người phản hồi chính là
   * tác giả (tự trả lời mình). CTA dẫn về trang đối tượng để xem hội thoại.
   */
  private async notifyReplyToAuthor(parent: Review, reply: Review): Promise<void> {
    if (parent.authorId === reply.authorId) return;
    let ctaHref: string | undefined;
    if (parent.targetType === ReviewTargetType.GUIDE) {
      ctaHref = `/guides/${parent.targetId}`;
    } else if (parent.targetType === ReviewTargetType.TRIP) {
      ctaHref = `/trips/${parent.targetId}`;
    }
    const preview = reply.comment?.trim()
      ? reply.comment.trim().slice(0, 140)
      : 'Hướng dẫn viên đã phản hồi đánh giá của bạn.';
    await this.notifications.push({
      userId: parent.authorId,
      actorId: reply.authorId,
      type: NotificationType.REVIEW_NEW,
      title: 'Phản hồi mới cho đánh giá của bạn',
      preview,
      ctaLabel: 'Xem phản hồi',
      ctaHref,
    });
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

  async remove(id: string, authorId: string) {
    const review = await this.repo.findOne({ where: { id, authorId } });
    const res = await this.repo.delete({ id, authorId });
    // Xoá review gốc → tính lại rating/review_count cho khớp thực tế.
    if (review && !review.parentId) {
      await this.recalcTarget(review.targetType, review.targetId).catch((e) =>
        this.logger.warn(`Không tính lại rating sau xoá: ${(e as Error).message}`),
      );
    }
    return res;
  }
}
