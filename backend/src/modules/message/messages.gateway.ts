import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { JwtUserPayload } from '@/common/types/jwt-payload.type';
import { MessagesService } from './messages.service';

interface AuthedSocket extends Socket {
  data: { userId?: string };
}

/**
 * Realtime chat gateway. Spec Phần 2:
 * - connection: validate JWT from auth token, auto-join all the user's rooms.
 * - join_room: subscribe to a single room (after a new conversation is opened).
 * - send_message: persist + broadcast to room.
 * - typing / stop_typing: broadcast presence to peers.
 * - mark_as_read: update last_read_at and notify peers.
 */
@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: true, credentials: true },
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(MessagesGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly svc: MessagesService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Validate JWT, attach userId, join all rooms the user is a member of. */
  async handleConnection(client: AuthedSocket) {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      ((client.handshake.headers.authorization as string | undefined)?.replace(/^Bearer\s+/i, ''));
    if (!token) {
      client.disconnect();
      return;
    }
    let payload: JwtUserPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtUserPayload>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-secret',
      });
    } catch {
      client.disconnect();
      return;
    }
    if (payload.type === 'refresh') {
      client.disconnect();
      return;
    }
    client.data.userId = payload.sub;
    const rooms = await this.svc.listMyConversationIds(payload.sub);
    for (const r of rooms) await client.join(r);
    this.logger.log(`User ${payload.sub} connected; joined ${rooms.length} rooms`);
    client.emit('connected', { userId: payload.sub, rooms });
  }

  handleDisconnect(client: AuthedSocket) {
    if (client.data.userId) {
      this.logger.log(`User ${client.data.userId} disconnected`);
    }
  }

  @SubscribeMessage('join_room')
  async onJoinRoom(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { roomId: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !body?.roomId) return { ok: false };
    if (!(await this.svc.isMember(body.roomId, userId))) return { ok: false };
    await client.join(body.roomId);
    client.to(body.roomId).emit('member_joined', { userId, roomId: body.roomId });
    return { ok: true };
  }

  @SubscribeMessage('send_message')
  async onSendMessage(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { roomId: string; content: string; attachment?: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !body?.roomId || !body?.content) return { ok: false };
    try {
      const message = await this.svc.send(body.roomId, userId, {
        content: body.content,
        attachment: body.attachment,
      });
      // Broadcast to everyone in the room (including sender so all clients of
      // the same user stay in sync, e.g. another tab).
      this.server.to(body.roomId).emit('new_message', message);
      return { ok: true, message };
    } catch (err) {
      const e = err as { message?: string };
      return { ok: false, error: e.message ?? 'send_failed' };
    }
  }

  @SubscribeMessage('typing')
  onTyping(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { roomId: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !body?.roomId) return;
    client.to(body.roomId).emit('typing', { userId, roomId: body.roomId });
  }

  @SubscribeMessage('stop_typing')
  onStopTyping(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { roomId: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !body?.roomId) return;
    client.to(body.roomId).emit('stop_typing', { userId, roomId: body.roomId });
  }

  @SubscribeMessage('mark_as_read')
  async onMarkRead(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { roomId: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !body?.roomId) return { ok: false };
    try {
      const { lastReadAt } = await this.svc.markAsRead(body.roomId, userId);
      client.to(body.roomId).emit('read_receipt', {
        userId,
        roomId: body.roomId,
        lastReadAt,
      });
      return { ok: true, lastReadAt };
    } catch {
      return { ok: false };
    }
  }
}
