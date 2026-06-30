import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

export class QueryTripsDto extends PaginationQueryDto {
  @IsOptional() @IsString() destination?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  /** Filter by creator user id — used by public profile pages. */
  @IsOptional() @IsUUID() creatorId?: string;
}

export class ItineraryActivityDto {
  @IsString() time!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];
}

export class ItineraryDayDto {
  @IsInt() @Min(1) dayNumber!: number;
  @IsDateString() date!: string;
  @IsString() title!: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItineraryActivityDto)
  activities?: ItineraryActivityDto[];
}

export class TripInclusionsDto {
  @IsOptional() @IsString() @MaxLength(120) accommodation?: string;
  @IsOptional() @IsString() @MaxLength(120) transport?: string;
  @IsOptional() @IsString() @MaxLength(120) meals?: string;
}

export class CreateTripDto {
  @IsString() title!: string;
  @IsString() description!: string;
  @IsString() destination!: string;
  @IsOptional() @IsString() @MaxLength(200) originName?: string;
  @IsOptional() @Type(() => Number) @IsNumber() originLat?: number;
  @IsOptional() @Type(() => Number) @IsNumber() originLng?: number;
  @IsOptional() @Type(() => Number) @IsNumber() destinationLat?: number;
  @IsOptional() @Type(() => Number) @IsNumber() destinationLng?: number;
  @IsUUID() categoryId!: string;
  @IsString() coverImage!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) galleryUrls?: string[];
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
  @IsInt() @Min(1) durationDays!: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) priceFrom?: number;
  @IsOptional() @IsString() currency?: string;
  @IsInt() @Min(1) maxMembers!: number;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional()
  @ValidateNested()
  @Type(() => TripInclusionsDto)
  inclusions?: TripInclusionsDto;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItineraryDayDto)
  itinerary?: ItineraryDayDto[];
}

export class UpdateTripDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() destination?: string;
  @IsOptional() @IsString() @MaxLength(200) originName?: string;
  @IsOptional() @Type(() => Number) @IsNumber() originLat?: number;
  @IsOptional() @Type(() => Number) @IsNumber() originLng?: number;
  @IsOptional() @Type(() => Number) @IsNumber() destinationLat?: number;
  @IsOptional() @Type(() => Number) @IsNumber() destinationLng?: number;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsString() coverImage?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) galleryUrls?: string[];
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsInt() @Min(1) durationDays?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) priceFrom?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsInt() @Min(1) maxMembers?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional()
  @ValidateNested()
  @Type(() => TripInclusionsDto)
  inclusions?: TripInclusionsDto;
}

export class JoinRequestDto {
  @IsOptional() @IsString() message?: string;
}

export class HireGuideDto {
  @IsUUID() guideId!: string;
}

export class CancelTripDto {
  /** Lý do huỷ — lưu lại để tra cứu, đính kèm thông báo cho thành viên/HDV. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
