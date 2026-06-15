import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuideProfile } from './entities/guide-profile.entity';
import { GuideBooking } from './entities/guide-booking.entity';
import { Wallet } from './entities/wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { User } from '@/modules/user/entities/user.entity';
import { Trip } from '@/modules/trip/entities/trip.entity';
import { TripMember } from '@/modules/trip/entities/trip-member.entity';
import { Review } from '@/modules/review/entities/review.entity';
import { GuidesService } from './guides.service';
import { GuidesController } from './guides.controller';
import { NotificationsModule } from '@/modules/notification/notifications.module';
import { SavedModule } from '@/modules/saved/saved.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GuideProfile,
      GuideBooking,
      Wallet,
      WalletTransaction,
      User,
      Trip,
      TripMember,
      Review,
    ]),
    NotificationsModule,
    forwardRef(() => SavedModule),
  ],
  providers: [GuidesService],
  controllers: [GuidesController],
  exports: [GuidesService],
})
export class GuidesModule {}
