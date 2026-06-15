import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { PostVisibility } from '../entities/post.entity';

export class QueryPostsDto extends PaginationQueryDto {
  @IsOptional() @IsString() tag?: string;
  @IsOptional() @IsUUID() authorId?: string;
  /** 'foryou' | 'following' | 'trending' */
  @IsOptional() @IsString() feed?: string;
}

export class CreatePostDto {
  @IsString() @MaxLength(300) title!: string;
  @IsString() excerpt!: string;
  @IsOptional() @IsString() body?: string;
  @IsString() @MaxLength(200) location!: string;
  @IsString() image!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) galleryUrls?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsUUID() tripId?: string;
  @IsOptional() @IsUUID() placeId?: string;
  @IsOptional() @IsEnum(PostVisibility) visibility?: PostVisibility;
}

export class UpdatePostDto {
  @IsOptional() @IsString() @MaxLength(300) title?: string;
  @IsOptional() @IsString() excerpt?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() @MaxLength(200) location?: string;
  @IsOptional() @IsString() image?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) galleryUrls?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsEnum(PostVisibility) visibility?: PostVisibility;
}

export class CreateCommentDto {
  @IsString() content!: string;
  @IsOptional() @IsUUID() parentId?: string;
}
