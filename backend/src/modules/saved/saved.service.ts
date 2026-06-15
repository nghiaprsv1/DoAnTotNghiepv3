import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedItem, SavedTargetType } from './entities/saved-item.entity';
import { Post, PostVisibility } from '@/modules/post/entities/post.entity';
import { Trip } from '@/modules/trip/entities/trip.entity';
import { GuideProfile } from '@/modules/guide/entities/guide-profile.entity';
import { GuidesService } from '@/modules/guide/guides.service';

const TYPES: readonly SavedTargetType[] = ['post', 'trip', 'guide'] as const;

@Injectable()
export class SavedService {
  constructor(
    @InjectRepository(SavedItem) private readonly saved: Repository<SavedItem>,
    @InjectRepository(Post) private readonly posts: Repository<Post>,
    @InjectRepository(Trip) private readonly trips: Repository<Trip>,
    @InjectRepository(GuideProfile) private readonly guides: Repository<GuideProfile>,
    @Inject(forwardRef(() => GuidesService))
    private readonly guidesService: GuidesService,
  ) {}

  private assertType(type: string): SavedTargetType {
    if (!TYPES.includes(type as SavedTargetType)) {
      throw new BadRequestException('Loại đối tượng không hợp lệ');
    }
    return type as SavedTargetType;
  }

  /** Verify the target row exists; raise 404 otherwise. */
  private async assertTarget(type: SavedTargetType, id: string) {
    if (type === 'post') {
      const exists = await this.posts.exist({ where: { id } });
      if (!exists) throw new NotFoundException('Post not found');
    } else if (type === 'trip') {
      const exists = await this.trips.exist({ where: { id } });
      if (!exists) throw new NotFoundException('Trip not found');
    } else {
      const exists = await this.guides.exist({ where: { id } });
      if (!exists) throw new NotFoundException('Guide not found');
    }
  }

  /** Toggle a bookmark and return the resulting state. */
  async toggle(
    userId: string,
    targetType: string,
    targetId: string,
  ): Promise<{ saved: boolean }> {
    const t = this.assertType(targetType);
    await this.assertTarget(t, targetId);
    const existing = await this.saved.findOne({
      where: { userId, targetType: t, targetId },
    });
    if (existing) {
      await this.saved.delete({ id: existing.id });
      return { saved: false };
    }
    await this.saved.save(
      this.saved.create({ userId, targetType: t, targetId }),
    );
    return { saved: true };
  }

  /** Bulk lookup: which of `ids` does the viewer already have saved? */
  async lookupSet(
    userId: string,
    targetType: SavedTargetType,
    ids: string[],
  ): Promise<Set<string>> {
    if (!userId || ids.length === 0) return new Set();
    const rows = await this.saved.find({
      where: ids.map((id) => ({ userId, targetType, targetId: id })),
    });
    return new Set(rows.map((r) => r.targetId));
  }

  /**
   * Return the list of `targetId`s the user has saved for `type`, newest
   * first. Used by the Profile "Đã lưu" tab to load the actual entities
   * via their existing services.
   */
  async listIds(userId: string, type: string): Promise<string[]> {
    const t = this.assertType(type);
    const rows = await this.saved.find({
      where: { userId, targetType: t },
      order: { createdAt: 'DESC' },
    });
    return rows.map((r) => r.targetId);
  }

  /** Hydrated list of saved posts (visibility-aware via the post lookup). */
  async listPosts(userId: string): Promise<Post[]> {
    const ids = await this.listIds(userId, 'post');
    if (ids.length === 0) return [];
    const rows = await this.posts.find({
      where: ids.map((id) => ({ id })),
      relations: ['author'],
    });
    // Drop friends-only posts the viewer can't see anymore. We treat the
    // saver as "viewer"; if they saved it but the author has since broken
    // the mutual follow, the post is hidden. Public posts always visible.
    const visible = rows.filter(
      (p) => p.visibility === PostVisibility.PUBLIC || p.authorId === userId,
    );
    // Preserve "newest saved first" ordering from `ids`.
    return ids
      .map((id) => visible.find((p) => p.id === id))
      .filter((p): p is Post => Boolean(p));
  }

  async listTrips(userId: string): Promise<Trip[]> {
    const ids = await this.listIds(userId, 'trip');
    if (ids.length === 0) return [];
    const rows = await this.trips.find({
      where: ids.map((id) => ({ id })),
      relations: ['category', 'creator', 'guide'],
    });
    return ids
      .map((id) => rows.find((t) => t.id === id))
      .filter((t): t is Trip => Boolean(t));
  }

  async listGuides(userId: string): Promise<GuideProfile[]> {
    const ids = await this.listIds(userId, 'guide');
    if (ids.length === 0) return [];
    const rows = await this.guides.find({
      where: ids.map((id) => ({ id })),
      relations: ['user'],
    });
    const ordered = ids
      .map((id) => rows.find((g) => g.id === id))
      .filter((g): g is GuideProfile => Boolean(g));
    // Decorate with live rating / reviewCount / toursCompleted / responseTime
    // so the Profile "Đã lưu" tab matches the listing page (the denormalized
    // columns on guide_profiles are stale seed data).
    return this.guidesService.attachStatsToGuides(ordered);
  }
}
