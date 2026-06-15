import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavedItem } from './entities/saved-item.entity';
import { Post } from '@/modules/post/entities/post.entity';
import { Trip } from '@/modules/trip/entities/trip.entity';
import { GuideProfile } from '@/modules/guide/entities/guide-profile.entity';
import { SavedService } from './saved.service';
import { SavedController } from './saved.controller';
import { GuidesModule } from '@/modules/guide/guides.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SavedItem, Post, Trip, GuideProfile]),
    forwardRef(() => GuidesModule),
  ],
  providers: [SavedService],
  controllers: [SavedController],
  exports: [SavedService],
})
export class SavedModule {}
