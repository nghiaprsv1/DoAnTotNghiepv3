import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { JwtUserPayload } from '@/common/types/jwt-payload.type';
import { MessagesService } from './messages.service';
import {
  CreateDirectMessageDto,
  CreateGroupDto,
  SendMessageDto,
} from './dto/message.dto';

@ApiTags('Messages')
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly svc: MessagesService) {}

  @Get('conversations')
  conversations(@CurrentUser() user: JwtUserPayload) {
    return this.svc.listConversations(user.sub);
  }

  @Post('direct')
  direct(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: CreateDirectMessageDto,
  ) {
    return this.svc.sendDirect(user.sub, dto);
  }

  /** Open (or create) a direct conversation with a peer + return history. */
  @Get('direct/:peerId')
  openDirect(
    @CurrentUser() user: JwtUserPayload,
    @Param('peerId', new ParseUUIDPipe()) peerId: string,
  ) {
    return this.svc.openDirectConversation(user.sub, peerId);
  }

  @Post('groups')
  createGroup(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: CreateGroupDto,
  ) {
    return this.svc.createGroup(user.sub, dto);
  }

  @Post(':id/messages')
  send(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.svc.send(id, user.sub, dto);
  }

  @Get(':id/messages')
  history(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return this.svc.listMessages(id, user.sub, {
      limit: limit ? Number(limit) : undefined,
      before,
    });
  }

  @Put(':id/read')
  markRead(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.svc.markAsRead(id, user.sub);
  }

  /** Delete one message (sender only). */
  @Delete('messages/:messageId')
  deleteMessage(
    @CurrentUser() user: JwtUserPayload,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
  ) {
    return this.svc.deleteMessage(messageId, user.sub);
  }

  /** Delete an entire conversation the caller is part of. */
  @Delete(':id')
  deleteConversation(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.svc.deleteConversation(id, user.sub);
  }
}
