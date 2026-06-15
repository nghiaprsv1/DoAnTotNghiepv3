import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { JwtUserPayload } from '@/common/types/jwt-payload.type';
import { AiService } from './ai.service';
import { TripsService } from '@/modules/trip/trips.service';
import { CreateTripDto } from '@/modules/trip/dto/trip.dto';

class HistoryTurnDto {
  /** 'user' | 'assistant' */
  @IsString() role!: 'user' | 'assistant';
  @IsString() content!: string;
}

class AskDto {
  @IsString() query!: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HistoryTurnDto)
  history?: HistoryTurnDto[];
  /**
   * Lộ trình đang dựng dở (nếu có) — FE gửi kèm để bot biết user đang chỉnh
   * sửa địa điểm hoặc chốt thông tin cho lộ trình nào.
   */
  @IsOptional() draft?: unknown;
}

class AiActivityDto {
  @IsString() time!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
}

class AiItineraryDayDto {
  @IsInt() @Min(1) dayNumber!: number;
  @IsString() title!: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiActivityDto)
  activities?: AiActivityDto[];
}

class AiInclusionsDto {
  @IsOptional() @IsString() accommodation?: string;
  @IsOptional() @IsString() transport?: string;
  @IsOptional() @IsString() meals?: string;
}

class CreateTripFromAiDto {
  @IsString() title!: string;
  @IsString() destination!: string;
  @IsInt() @Min(1) durationDays!: number;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
  @IsString() summary!: string;
  @IsOptional() @IsString() categoryKey?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsString() coverImage?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) estimatedBudget?: number;
  @IsOptional() @IsInt() @Min(2) maxMembers?: number;
  @IsOptional()
  @ValidateNested()
  @Type(() => AiInclusionsDto)
  inclusions?: AiInclusionsDto;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiItineraryDayDto)
  itinerary?: AiItineraryDayDto[];
}

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80';

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(
    private readonly svc: AiService,
    private readonly trips: TripsService,
  ) {}

  /** Public — guests can chat with the bot too. */
  @Public()
  @Post('ask')
  ask(@Body() dto: AskDto, @CurrentUser() user?: JwtUserPayload) {
    return this.svc.ask(user?.sub, dto.query, dto.history ?? [], dto.draft as never);
  }

  /**
   * Materialize a Trip directly from the bot's draft. Auth required because
   * the trip is owned by the requester (creator becomes the leader).
   */
  @UseGuards(JwtAuthGuard)
  @Post('create-trip')
  async createTrip(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: CreateTripFromAiDto,
  ) {
    // Resolve dates: default to "tomorrow + durationDays".
    const start = dto.startDate ? new Date(dto.startDate) : addDays(new Date(), 7);
    const end = dto.endDate ? new Date(dto.endDate) : addDays(start, dto.durationDays - 1);
    const startIso = start.toISOString().slice(0, 10);
    const endIso = end.toISOString().slice(0, 10);

    const categoryId = await this.svc.resolveCategoryId(dto.categoryKey);
    const itinerary = dto.itinerary?.map((d) => ({
      dayNumber: d.dayNumber,
      // Compute date for each itinerary day from start.
      date: addDays(start, d.dayNumber - 1).toISOString().slice(0, 10),
      title: d.title,
      activities: d.activities,
    }));

    const payload: CreateTripDto = {
      title: dto.title,
      description: dto.summary,
      destination: dto.destination,
      categoryId,
      coverImage: dto.coverImage || DEFAULT_COVER,
      startDate: startIso,
      endDate: endIso,
      durationDays: dto.durationDays,
      priceFrom: dto.estimatedBudget ?? 0,
      currency: 'VND',
      maxMembers: dto.maxMembers ?? 8,
      tags: dto.tags,
      inclusions: dto.inclusions,
      itinerary,
    };

    return this.trips.create(user.sub, payload);
  }
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + days);
  return x;
}
