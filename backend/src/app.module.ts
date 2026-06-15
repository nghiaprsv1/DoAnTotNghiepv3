import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { buildTypeOrmOptions } from './database/typeorm.config';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/user/users.module';
import { PlacesModule } from './modules/place/places.module';
import { TripsModule } from './modules/trip/trips.module';
import { PostsModule } from './modules/post/posts.module';
import { GuidesModule } from './modules/guide/guides.module';
import { MessagesModule } from './modules/message/messages.module';
import { ReviewsModule } from './modules/review/reviews.module';
import { NotificationsModule } from './modules/notification/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { AiModule } from './modules/ai/ai.module';
import { UploadModule } from './modules/upload/upload.module';
import { SavedModule } from './modules/saved/saved.module';
import { PaymentsModule } from './modules/payment/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => buildTypeOrmOptions(cfg),
    }),
    AuthModule,
    UsersModule,
    PlacesModule,
    TripsModule,
    PostsModule,
    GuidesModule,
    MessagesModule,
    ReviewsModule,
    NotificationsModule,
    AdminModule,
    AiModule,
    UploadModule,
    SavedModule,
    PaymentsModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    /** Apply JWT globally — routes opt out via @Public(). */
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
