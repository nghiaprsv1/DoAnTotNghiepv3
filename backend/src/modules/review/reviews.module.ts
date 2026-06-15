import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './entities/review.entity';
import { Like } from '@/modules/post/entities/like.entity';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Like])],
  providers: [ReviewsService],
  controllers: [ReviewsController],
})
export class ReviewsModule {}
