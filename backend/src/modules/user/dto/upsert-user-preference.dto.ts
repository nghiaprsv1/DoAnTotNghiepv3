import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Upsert payload for the dedicated `user_preferences` table — a structured,
 * AI-personalization profile kept separate from the free-form `users.preferences`
 * JSONB (which powers the public profile chips and trip-recommendation score).
 *
 * Each list is free-form canonical keys chosen by the FE, e.g. categories
 * ("beach", "mountain"), provinces ("da-nang"), interests ("street-food").
 */
export class UpsertUserPreferenceDto {
  @IsOptional() @IsArray() @IsString({ each: true }) categories?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) interests?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) provinces?: string[];
  @IsOptional() @IsString() @MaxLength(20) budgetTier?: string;
}
