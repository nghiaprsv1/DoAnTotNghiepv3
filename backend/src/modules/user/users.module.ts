import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Follow } from './entities/follow.entity';
import { Post } from '@/modules/post/entities/post.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { NotificationsModule } from '@/modules/notification/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, Follow, Post]), NotificationsModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
