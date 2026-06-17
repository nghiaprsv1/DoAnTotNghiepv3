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
import { JwtUserPayload } from '@/common/types/jwt-payload.type';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '@/modules/auth/guards/optional-jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpsertUserPreferenceDto } from './dto/upsert-user-preference.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Search by name / handle / email. Public — used by the global search UI. */
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get('search')
  search(
    @Query('q') q: string,
    @Query('limit') limit?: string,
    @CurrentUser() viewer?: JwtUserPayload,
  ) {
    return this.users.search(q ?? '', viewer?.sub, Number(limit) || 20);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  getPublicProfile(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() viewer?: JwtUserPayload,
  ) {
    return this.users.getPublicProfile(id, viewer?.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  updateMe(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.users.update(user.sub, dto);
  }

  /** Structured AI-personalization preferences. Must precede `:id` routes. */
  @UseGuards(JwtAuthGuard)
  @Get('me/preferences')
  getMyPreferences(@CurrentUser() user: JwtUserPayload) {
    return this.users.getPreferences(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me/preferences')
  upsertMyPreferences(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: UpsertUserPreferenceDto,
  ) {
    return this.users.upsertPreferences(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/follow')
  async follow(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.users.follow(user.sub, id);
    return { isFollowing: true };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/follow')
  async unfollow(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.users.unfollow(user.sub, id);
    return { isFollowing: false };
  }

  @Public()
  @Get(':id/followers')
  followers(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.users.listFollowers(id);
  }

  @Public()
  @Get(':id/following')
  following(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.users.listFollowing(id);
  }
}
