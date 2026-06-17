import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trip } from './entities/trip.entity';
import { TripMember } from './entities/trip-member.entity';
import { TripJoinRequest } from './entities/trip-join-request.entity';
import { ItineraryDay } from './entities/itinerary-day.entity';
import { ItineraryActivity } from './entities/itinerary-activity.entity';
import { TripInteraction } from './entities/trip-interaction.entity';
import { User } from '@/modules/user/entities/user.entity';
import { UserPreference } from '@/modules/user/entities/user-preference.entity';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';
import { NotificationsModule } from '@/modules/notification/notifications.module';
import { MessagesModule } from '@/modules/message/messages.module';
import { SavedModule } from '@/modules/saved/saved.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Trip,
      TripMember,
      TripJoinRequest,
      ItineraryDay,
      ItineraryActivity,
      TripInteraction,
      User,
      UserPreference,
    ]),
    NotificationsModule,
    MessagesModule,
    SavedModule,
  ],
  providers: [TripsService],
  controllers: [TripsController],
  exports: [TripsService],
})
export class TripsModule {}
