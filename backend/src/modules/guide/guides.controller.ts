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
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/common/enums/user-role.enum';
import { JwtUserPayload } from '@/common/types/jwt-payload.type';
import { GuidesService } from './guides.service';
import {
  CreateBookingDto,
  CreateUnavailabilityDto,
  GuideApplyDto,
  QueryGuidesDto,
  RespondBookingDto,
  UpdateGuideProfileDto,
  WithdrawDto,
  WithdrawDecisionDto,
} from './dto/guide.dto';

@ApiTags('Guides')
@Controller('guides')
export class GuidesController {
  constructor(private readonly svc: GuidesService) {}

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  list(@Query() q: QueryGuidesDto, @CurrentUser() viewer?: JwtUserPayload) {
    return this.svc.list(q, viewer?.sub);
  }

  /** The signed-in guide's own profile (any status). Must precede `:id`. */
  @UseGuards(JwtAuthGuard)
  @Get('me/profile')
  myProfile(@CurrentUser() user: JwtUserPayload) {
    return this.svc.getMyProfile(user.sub);
  }

  /** Update the signed-in guide's own professional profile. */
  @UseGuards(JwtAuthGuard)
  @Put('me/profile')
  updateMyProfile(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: UpdateGuideProfileDto,
  ) {
    return this.svc.updateMyProfile(user.sub, dto);
  }

  /** Ngày nghỉ HDV tự đánh dấu — danh sách của chính mình. */
  @UseGuards(JwtAuthGuard)
  @Get('me/unavailability')
  myUnavailability(@CurrentUser() user: JwtUserPayload) {
    return this.svc.listMyUnavailability(user.sub);
  }

  /** Thêm 1 khoảng ngày nghỉ (chặn nếu trùng booking đang sống). */
  @UseGuards(JwtAuthGuard)
  @Post('me/unavailability')
  addUnavailability(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: CreateUnavailabilityDto,
  ) {
    return this.svc.addUnavailability(user.sub, dto);
  }

  /** Gỡ 1 khoảng ngày nghỉ. */
  @UseGuards(JwtAuthGuard)
  @Delete('me/unavailability/:id')
  removeUnavailability(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.svc.removeUnavailability(user.sub, id);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  detail(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() viewer?: JwtUserPayload,
  ) {
    return this.svc.detail(id, viewer?.sub);
  }

  /** Public — date ranges the guide is unavailable (active bookings). */
  @Public()
  @Get(':id/busy-dates')
  busyDates(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.svc.busyDates(id);
  }

  /** Public — lịch sử tour đã hoàn thành của HDV (tab "Lịch sử tour"). */
  @Public()
  @Get(':id/tour-history')
  tourHistory(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.svc.tourHistory(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('apply')
  apply(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: GuideApplyDto,
  ) {
    return this.svc.apply(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post(':id/approve')
  approve(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.svc.review(id, true);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post(':id/reject')
  reject(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { reason?: string },
  ) {
    return this.svc.review(id, false, body.reason);
  }

  @UseGuards(JwtAuthGuard)
  @Post('bookings')
  book(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: CreateBookingDto,
  ) {
    return this.svc.createBooking(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('bookings/:id')
  respondBooking(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RespondBookingDto,
  ) {
    return this.svc.respondBooking(id, user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('bookings/:id')
  bookingDetail(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.svc.getBookingDetail(id, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('bookings/me/traveler')
  myBookingsTraveler(@CurrentUser() user: JwtUserPayload) {
    return this.svc.listMyBookingsAsTraveler(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('bookings/me/guide')
  myBookingsGuide(@CurrentUser() user: JwtUserPayload) {
    return this.svc.listMyBookingsAsGuide(user.sub);
  }

  /* ───────────────────────────── Wallet ────────────────────────────── */

  @UseGuards(JwtAuthGuard)
  @Get('wallet/me')
  myWallet(@CurrentUser() user: JwtUserPayload) {
    return this.svc.getMyWallet(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('wallet/withdrawals')
  withdraw(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: WithdrawDto,
  ) {
    return this.svc.requestWithdrawal(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('wallet/withdrawals/pending')
  pendingWithdrawals() {
    return this.svc.pendingWithdrawals();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('wallet/withdrawals/history')
  withdrawalHistory(@Query('limit') limit?: string) {
    return this.svc.withdrawalHistory(limit ? Number(limit) : 100);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put('wallet/withdrawals/:id')
  decideWithdrawal(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: WithdrawDecisionDto,
  ) {
    return this.svc.decideWithdrawal(id, dto);
  }
}
