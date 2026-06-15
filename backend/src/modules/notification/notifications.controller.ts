import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { JwtUserPayload } from '@/common/types/jwt-payload.type';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: JwtUserPayload) {
    return this.svc.list(user.sub);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: JwtUserPayload) {
    return this.svc.unreadCount(user.sub).then((count) => ({ count }));
  }

  @Get(':id')
  detail(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.svc.detail(id, user.sub);
  }

  @Put(':id/read')
  async markRead(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.svc.markRead(id, user.sub);
    return null;
  }

  @Put('read-all')
  async markAll(@CurrentUser() user: JwtUserPayload) {
    await this.svc.markAllRead(user.sub);
    return null;
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.svc.remove(id, user.sub);
    return null;
  }
}
