import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ReviewTargetType } from '../entities/review.entity';

export class CreateReviewDto {
  @IsEnum(ReviewTargetType) targetType!: ReviewTargetType;
  @IsUUID() targetId!: string;
  @Type(() => Number) @IsInt() @Min(0) @Max(5) rating!: number;
  @IsOptional() @IsString() comment?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  /** When set, the new review is a reply to that review id (no rating rule). */
  @IsOptional() @IsUUID() parentId?: string;
}
