import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { GuideProfile } from '@/modules/guide/entities/guide-profile.entity';
import { GuideBooking } from '@/modules/guide/entities/guide-booking.entity';
import { Wallet } from '@/modules/guide/entities/wallet.entity';
import { WalletTransaction } from '@/modules/guide/entities/wallet-transaction.entity';
import { Post } from '@/modules/post/entities/post.entity';
import { Comment } from '@/modules/post/entities/comment.entity';
import { Like } from '@/modules/post/entities/like.entity';
import { Trip } from '@/modules/trip/entities/trip.entity';
import { AdminAuditLog } from './entities/admin-audit-log.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { GuidesModule } from '@/modules/guide/guides.module';
import { NotificationsModule } from '@/modules/notification/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      GuideProfile,
      GuideBooking,
      Wallet,
      WalletTransaction,
      Post,
      Comment,
      Like,
      Trip,
      AdminAuditLog,
    ]),
    GuidesModule,
    NotificationsModule,
  ],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
