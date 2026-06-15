import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { JwtUserPayload } from '@/common/types/jwt-payload.type';
import { SavedService } from './saved.service';

@ApiTags('Saved')
@UseGuards(JwtAuthGuard)
@Controller('saved')
export class SavedController {
  constructor(private readonly svc: SavedService) {}

  /**
   * Toggle a bookmark on a target. Body: `{ targetType, targetId }`.
   * Returns `{ saved: true|false }` reflecting the new state.
   */
  @Post('toggle')
  toggle(
    @CurrentUser() user: JwtUserPayload,
    @Body() body: { targetType: string; targetId: string },
  ) {
    return this.svc.toggle(user.sub, body.targetType, body.targetId);
  }

  /** Convenience: dedicated path that mirrors the like APIs. */
  @Post(':type/:id')
  toggleByPath(
    @CurrentUser() user: JwtUserPayload,
    @Param('type') type: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.svc.toggle(user.sub, type, id);
  }

  @Get('posts')
  posts(@CurrentUser() user: JwtUserPayload) {
    return this.svc.listPosts(user.sub);
  }

  @Get('trips')
  trips(@CurrentUser() user: JwtUserPayload) {
    return this.svc.listTrips(user.sub);
  }

  @Get('guides')
  guides(@CurrentUser() user: JwtUserPayload) {
    return this.svc.listGuides(user.sub);
  }
}
