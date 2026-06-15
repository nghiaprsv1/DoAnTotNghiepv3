import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateDirectMessageDto {
  @IsUUID() peerId!: string;
  @IsString() content!: string;
  @IsOptional() @IsString() attachment?: string;
}

export class CreateGroupDto {
  @IsString() groupName!: string;
  @IsOptional() @IsString() groupAvatar?: string;
  @IsArray() @IsUUID(undefined, { each: true }) memberIds!: string[];
}

export class SendMessageDto {
  @IsString() content!: string;
  @IsOptional() @IsString() attachment?: string;
}
