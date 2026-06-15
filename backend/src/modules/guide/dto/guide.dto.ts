import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

export class QueryGuidesDto extends PaginationQueryDto {
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() availability?: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxPrice?: number;
  /** Only return guides free for the whole [availableFrom, availableTo] range. */
  @IsOptional() @IsDateString() availableFrom?: string;
  @IsOptional() @IsDateString() availableTo?: string;
}

export class GuideApplyDto {
  @IsString() region!: string;
  @IsArray() @IsString({ each: true }) regionKeys!: string[];
  @IsArray() @IsString({ each: true }) categoryKeys!: string[];
  @IsArray() @IsString({ each: true }) languages!: string[];
  @IsArray() @IsString({ each: true }) specialties!: string[];
  @IsOptional() @IsString() bio?: string;
  @IsInt() @Min(0) yearsExperience!: number;
  @IsNumber() @Min(0) pricePerDay!: number;
  @IsString() currency!: string;
  @IsString() idCardNumber!: string;
  @IsOptional() @IsString() idCardImage?: string;
}

export class CreateBookingDto {
  @IsUUID() guideId!: string;
  @IsString() tourTitle!: string;
  @IsString() tourCover!: string;
  @IsString() destination!: string;
  @IsDateString() startDate!: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsInt() @Min(1) durationDays!: number;
  @IsInt() @Min(1) groupSize!: number;
  @IsNumber() @Min(0) amount!: number;
  @IsString() currency!: string;
  @IsOptional() @IsString() message?: string;
  /** Required: trip the booking is gắn into. Owner must be a member of it. */
  @IsUUID() tripId!: string;
}

export class AdminTopUpDto {
  @IsUUID() userId!: string;
  @IsNumber() @Min(1000) amount!: number;
  @IsOptional() @IsString() note?: string;
}

export class RespondBookingDto {
  /** 'accept' | 'reject' | 'cancel' | 'complete' | 'pay' */
  @IsString() action!: string;
  @IsOptional() @IsString() reason?: string;
}

export class WithdrawDto {
  @IsNumber() @Min(1) amount!: number;
  @IsOptional() @IsString() bankAccount?: string;
}

export class WithdrawDecisionDto {
  /** 'approve' | 'reject' */
  @IsString() action!: string;
  @IsOptional() @IsString() reason?: string;
}
