import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './entities/review.entity';
import { Like } from '@/modules/post/entities/like.entity';
import { GuideProfile } from '@/modules/guide/entities/guide-profile.entity';
import { Trip } from '@/modules/trip/entities/trip.entity';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { NotificationsModule } from '@/modules/notification/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review, Like, GuideProfile, Trip]),
    NotificationsModule,
  ],
  providers: [ReviewsService],
  controllers: [ReviewsController],
})
export class ReviewsModule {}
