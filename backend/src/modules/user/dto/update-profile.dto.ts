import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class SocialLinksDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  instagram?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  facebook?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tiktok?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  website?: string;
}

/**
 * Travel preferences saved as JSONB on the user. Each list is capped to 16
 * entries to keep the JSON small; values are free-form strings (FE picks the
 * canonical keys, e.g. "adventure", "beach", "vi").
 */
export class TravelPreferencesDto {
  @IsOptional() @IsArray() @IsString({ each: true }) travelStyles?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) tripPurposes?: string[];
  @IsOptional() @IsString() @MaxLength(40) budgetLevel?: string;
  @IsOptional() @IsString() @MaxLength(40) experienceLevel?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) terrainPrefs?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) activities?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) languages?: string[];
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  handle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatar?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cover?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TravelPreferencesDto)
  preferences?: TravelPreferencesDto;
}
