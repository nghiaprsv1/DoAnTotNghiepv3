import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './entities/post.entity';
import { Comment } from './entities/comment.entity';
import { Like } from './entities/like.entity';
import { Follow } from '@/modules/user/entities/follow.entity';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { NotificationsModule } from '@/modules/notification/notifications.module';
import { SavedModule } from '@/modules/saved/saved.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post, Comment, Like, Follow]),
    NotificationsModule,
    SavedModule,
  ],
  providers: [PostsService],
  controllers: [PostsController],
  exports: [PostsService],
})
export class PostsModule {}
