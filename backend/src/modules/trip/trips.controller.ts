import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '@/modules/auth/guards/optional-jwt-auth.guard';
import { JwtUserPayload } from '@/common/types/jwt-payload.type';
import { TripsService } from './trips.service';
import {
  CreateTripDto,
  HireGuideDto,
  ItineraryDayDto,
  JoinRequestDto,
  QueryTripsDto,
  UpdateTripDto,
} from './dto/trip.dto';

@ApiTags('Trips')
@Controller('trips')
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  list(@Query() q: QueryTripsDto, @CurrentUser() viewer?: JwtUserPayload) {
    return this.trips.list(q, viewer?.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine/created')
  mine(@CurrentUser() user: JwtUserPayload) {
    return this.trips.listMine(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine/joined')
  joined(@CurrentUser() user: JwtUserPayload) {
    return this.trips.listJoined(user.sub);
  }

  /**
   * Personalised list of trips for the currently signed-in viewer. Returns up
   * to `limit` trips sorted by a score derived from User.preferences.
   * Public route — anonymous users get a generic high-rating list.
   */
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get('recommended')
  recommended(
    @Query('limit') limit?: string,
    @CurrentUser() viewer?: JwtUserPayload,
  ) {
    const n = limit ? Math.min(20, Math.max(1, Number(limit))) : 6;
    return this.trips.recommend(viewer?.sub, n);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  detail(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() viewer?: JwtUserPayload,
  ) {
    return this.trips.findByIdForViewer(id, viewer?.sub);
  }

  /** Track a detail-page view (độ hot). Public — guests count too. */
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Post(':id/view')
  async view(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() viewer?: JwtUserPayload,
  ) {
    await this.trips.recordView(id, viewer?.sub);
    return null;
  }

  /** Track a card click in a list (độ hot). Public — guests count too. */
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Post(':id/click')
  async click(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() viewer?: JwtUserPayload,
  ) {
    await this.trips.recordClick(id, viewer?.sub);
    return null;
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: CreateTripDto,
  ) {
    return this.trips.create(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.trips.update(id, user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.trips.remove(id, user.sub);
    return null;
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/cancel')
  cancel(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.trips.cancelTrip(id, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/join')
  requestJoin(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: JoinRequestDto,
  ) {
    return this.trips.requestJoin(id, user.sub, dto.message);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/leave')
  leave(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.trips.leave(id, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/requests/:reqId/accept')
  accept(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('reqId', new ParseUUIDPipe()) reqId: string,
  ) {
    return this.trips.respondJoin(id, reqId, user.sub, true);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/requests/:reqId/reject')
  reject(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('reqId', new ParseUUIDPipe()) reqId: string,
  ) {
    return this.trips.respondJoin(id, reqId, user.sub, false);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/members/:userId')
  async kick(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('userId', new ParseUUIDPipe()) memberId: string,
  ) {
    await this.trips.kickMember(id, memberId, user.sub);
    return null;
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/hire-guide')
  hire(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: HireGuideDto,
  ) {
    return this.trips.hireGuide(id, dto.guideId, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/itinerary')
  saveItinerary(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { days: ItineraryDayDto[] },
  ) {
    return this.trips.upsertItinerary(id, user.sub, body.days);
  }
}
