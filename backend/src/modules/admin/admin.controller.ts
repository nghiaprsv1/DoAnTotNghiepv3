import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/common/enums/user-role.enum';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly svc: AdminService) {}

  @Get('dashboard')
  dashboard() {
    return this.svc.dashboard();
  }

  @Get('revenue')
  revenue(@Query('startDate') start?: string, @Query('endDate') end?: string) {
    return this.svc.revenueReport(start, end);
  }

  @Get('guides/pending')
  pending() {
    return this.svc.pendingGuides();
  }

  @Get('users')
  users(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('status') status?: 'active' | 'banned',
  ) {
    return this.svc.listUsers({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 50,
      role,
      search,
      status,
    });
  }

  @Post('users/:id/lock')
  async lock(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.svc.setLock(id, true);
    return null;
  }

  @Post('users/:id/unlock')
  async unlock(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.svc.setLock(id, false);
    return null;
  }

  @Post('notifications')
  notify(
    @Body()
    body: {
      title: string;
      content: string;
      receiverId?: string;
      sendToAll?: boolean;
      image?: string;
    },
  ) {
    return this.svc.broadcastNotification(body);
  }

  /* ─────────────────────────── Wallet ─────────────────────────── */

  @Get('wallets')
  wallets(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.svc.listWallets({
      search,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 30,
    });
  }

  @Post('wallets/topup')
  topUp(@Body() body: { userId: string; amount: number; note?: string }) {
    if (!body?.userId || !body?.amount) {
      return { error: 'userId and amount required' };
    }
    return this.svc.topUpUser(body.userId, Number(body.amount), body.note);
  }

  /** Bulk top-up — credit the same amount to multiple users at once. */
  @Post('wallets/topup-bulk')
  topUpBulk(@Body() body: { userIds: string[]; amount: number; note?: string }) {
    return this.svc.topUpManyUsers(body?.userIds ?? [], Number(body?.amount), body?.note);
  }

  /* ─────────────────────────── Analytics ─────────────────────────── */

  /** Registration timeline for marketing — buckets by day / week / month. */
  @Get('stats/registrations')
  registrations(
    @Query('granularity') granularity?: 'day' | 'week' | 'month',
    @Query('startDate') start?: string,
    @Query('endDate') end?: string,
  ) {
    return this.svc.registrationStats({ granularity, start, end });
  }

  /** Detailed revenue breakdown for one guide. */
  @Get('guides/:id/revenue')
  guideRevenue(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.svc.guideRevenueDetail(id);
  }

  /* ─────────────────────────── Posts ─────────────────────────── */

  @Get('posts')
  listPosts(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.svc.listPosts({
      search,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
  }

  @Delete('posts/:id')
  async deletePost(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.svc.deletePost(id);
    return null;
  }

  /* ─────────────────────────── Trips ─────────────────────────── */

  @Get('trips')
  listTrips(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.svc.listTrips({
      search,
      status,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
  }
}
