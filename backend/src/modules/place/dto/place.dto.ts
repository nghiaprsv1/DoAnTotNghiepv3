import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

export class QueryPlacesDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  category?: string; // category key

  @IsOptional()
  @IsString()
  province?: string; // province slug or id

  @IsOptional()
  @IsString()
  keyword?: string;
}

export class CreatePlaceDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsString()
  @MaxLength(220)
  slug!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  longDescription?: string;

  @IsUUID()
  categoryId!: string;

  @IsUUID()
  provinceId!: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsString()
  coverImage!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  gallery?: string[];

  @IsOptional()
  @IsString()
  entranceFee?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rating?: number;
}

export class UpdatePlaceDto extends CreatePlaceDto {}
