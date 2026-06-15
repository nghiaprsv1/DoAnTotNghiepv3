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
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '@/modules/auth/guards/optional-jwt-auth.guard';
import { JwtUserPayload } from '@/common/types/jwt-payload.type';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/review.dto';
import { ReviewTargetType } from './entities/review.entity';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly svc: ReviewsService) {}

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  list(
    @Query('targetType') targetType: ReviewTargetType,
    @Query('targetId') targetId: string,
    @CurrentUser() viewer?: JwtUserPayload,
  ) {
    return this.svc.list(targetType, targetId, viewer?.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: CreateReviewDto,
  ) {
    return this.svc.create(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/like')
  toggleLike(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.svc.toggleLike(id, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.svc.remove(id, user.sub);
    return null;
  }
}
