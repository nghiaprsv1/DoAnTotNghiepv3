import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  /** Service-to-service helper called by other modules. */
  push(input: {
    userId: string;
    type: NotificationType;
    title: string;
    preview: string;
    body?: string;
    actorId?: string;
    ctaLabel?: string;
    ctaHref?: string;
    image?: string;
    meta?: { label: string; value: string; icon?: string }[];
  }): Promise<Notification> {
    return this.repo.save(this.repo.create(input));
  }

  list(userId: string) {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  detail(id: string, userId: string) {
    return this.repo.findOne({ where: { id, userId } });
  }

  unreadCount(userId: string): Promise<number> {
    return this.repo.count({ where: { userId, read: false } });
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.repo.update({ id, userId }, { read: true });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.repo.update({ userId, read: false }, { read: true });
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.repo.delete({ id, userId });
  }
}
