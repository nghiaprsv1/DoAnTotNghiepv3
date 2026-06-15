import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Conversation, ConversationKind } from './entities/conversation.entity';
import { ConversationMember } from './entities/conversation-member.entity';
import { ChatMessage, MessageStatus } from './entities/chat-message.entity';
import {
  CreateDirectMessageDto,
  CreateGroupDto,
  SendMessageDto,
} from './dto/message.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Conversation) private readonly convs: Repository<Conversation>,
    @InjectRepository(ConversationMember) private readonly members: Repository<ConversationMember>,
    @InjectRepository(ChatMessage) private readonly messages: Repository<ChatMessage>,
    private readonly dataSource: DataSource,
  ) {}

  async listConversations(userId: string) {
    const memberships = await this.members.find({
      where: { userId },
      relations: ['conversation', 'conversation.members', 'conversation.members.user'],
      order: { conversation: { lastMessageAt: 'DESC' } },
    });
    return memberships.map((m) => m.conversation);
  }

  async getOrCreateDirect(userId: string, peerId: string): Promise<Conversation> {
    if (userId === peerId) throw new ForbiddenException();
    const sub = this.members
      .createQueryBuilder('m')
      .select('m.conversation_id', 'cid')
      .where('m.user_id IN (:...ids)', { ids: [userId, peerId] })
      .groupBy('m.conversation_id')
      .having('COUNT(*) = 2');
    const cidRow = await this.convs
      .createQueryBuilder('c')
      .where('c.kind = :k', { k: ConversationKind.DIRECT })
      .andWhere(`c.id IN (${sub.getQuery()})`, sub.getParameters())
      .getOne();
    if (cidRow) return cidRow;

    return this.dataSource.transaction(async (m) => {
      const conv = await m.getRepository(Conversation).save(
        m.getRepository(Conversation).create({ kind: ConversationKind.DIRECT }),
      );
      await m.getRepository(ConversationMember).save([
        m.getRepository(ConversationMember).create({ conversationId: conv.id, userId }),
        m.getRepository(ConversationMember).create({ conversationId: conv.id, userId: peerId }),
      ]);
      return conv;
    });
  }

  async createGroup(userId: string, dto: CreateGroupDto): Promise<Conversation> {
    return this.dataSource.transaction(async (m) => {
      const conv = await m.getRepository(Conversation).save(
        m.getRepository(Conversation).create({
          kind: ConversationKind.GROUP,
          groupName: dto.groupName,
          groupAvatar: dto.groupAvatar,
        }),
      );
      const memberIds = Array.from(new Set([userId, ...dto.memberIds]));
      await m.getRepository(ConversationMember).save(
        memberIds.map((id) =>
          m.getRepository(ConversationMember).create({
            conversationId: conv.id,
            userId: id,
            isAdmin: id === userId,
          }),
        ),
      );
      return conv;
    });
  }

  async sendDirect(userId: string, dto: CreateDirectMessageDto): Promise<ChatMessage> {
    const conv = await this.getOrCreateDirect(userId, dto.peerId);
    return this.send(conv.id, userId, { content: dto.content, attachment: dto.attachment });
  }

  async send(
    conversationId: string,
    senderId: string,
    dto: SendMessageDto,
  ): Promise<ChatMessage> {
    const member = await this.members.findOne({ where: { conversationId, userId: senderId } });
    if (!member) throw new ForbiddenException('Not a member');
    const message = await this.messages.save(
      this.messages.create({
        conversationId,
        senderId,
        content: dto.content,
        attachment: dto.attachment,
        status: MessageStatus.SENT,
      }),
    );
    await this.convs.update({ id: conversationId }, {
      lastMessage: dto.content,
      lastMessageAt: message.createdAt,
    });
    return message;
  }

  async listMessages(
    conversationId: string,
    userId: string,
    opts?: { limit?: number; before?: string },
  ) {
    const member = await this.members.findOne({ where: { conversationId, userId } });
    if (!member) throw new ForbiddenException();
    const limit = Math.min(opts?.limit ?? 50, 200);
    const qb = this.messages
      .createQueryBuilder('m')
      .where('m.conversationId = :cid', { cid: conversationId })
      .orderBy('m.createdAt', 'DESC')
      .take(limit);
    if (opts?.before) qb.andWhere('m.createdAt < :before', { before: opts.before });
    const rows = await qb.getMany();
    // Return ascending (oldest first) for the UI.
    return rows.reverse();
  }

  /** Update the last_read_at for the caller in the conversation. */
  async markAsRead(conversationId: string, userId: string): Promise<{ lastReadAt: Date }> {
    const member = await this.members.findOne({ where: { conversationId, userId } });
    if (!member) throw new ForbiddenException();
    const now = new Date();
    member.lastReadAt = now;
    await this.members.save(member);
    return { lastReadAt: now };
  }

  /** Get-or-create direct conversation, plus an initial page of messages. */
  async openDirectConversation(userId: string, peerId: string) {
    const conv = await this.getOrCreateDirect(userId, peerId);
    const messages = await this.listMessages(conv.id, userId, { limit: 50 });
    return { conversation: conv, messages };
  }

  /** Membership check for the realtime gateway. */
  async isMember(conversationId: string, userId: string): Promise<boolean> {
    return !!(await this.members.findOne({ where: { conversationId, userId } }));
  }

  /** All conversation ids a user belongs to (used by gateway on connect). */
  async listMyConversationIds(userId: string): Promise<string[]> {
    const rows = await this.members.find({ where: { userId }, select: { conversationId: true } });
    return rows.map((r) => r.conversationId);
  }

  /* ─────────────── Trip-bound group conversations ─────────────── */

  /**
   * Create the trip's group conversation if it doesn't exist yet, and ensure
   * the leader is a member-admin. Idempotent — safe to call from anywhere in
   * the trip lifecycle if a row may already exist (e.g. legacy trips).
   */
  async ensureTripGroup(
    tripId: string,
    leaderId: string,
    groupName: string,
    groupAvatar?: string,
  ): Promise<Conversation> {
    const existing = await this.convs.findOne({ where: { tripId } });
    if (existing) {
      // Make sure the leader is a member (e.g. transferring ownership later).
      const has = await this.members.findOne({
        where: { conversationId: existing.id, userId: leaderId },
      });
      if (!has) {
        await this.members.save(
          this.members.create({
            conversationId: existing.id,
            userId: leaderId,
            isAdmin: true,
          }),
        );
      }
      return existing;
    }
    return this.dataSource.transaction(async (m) => {
      const conv = await m.getRepository(Conversation).save(
        m.getRepository(Conversation).create({
          kind: ConversationKind.GROUP,
          groupName,
          groupAvatar,
          tripId,
        }),
      );
      await m.getRepository(ConversationMember).save(
        m.getRepository(ConversationMember).create({
          conversationId: conv.id,
          userId: leaderId,
          isAdmin: true,
        }),
      );
      return conv;
    });
  }

  /** Add a user to a conversation if not already a member. No-op otherwise. */
  async addMember(conversationId: string, userId: string): Promise<void> {
    const has = await this.members.findOne({ where: { conversationId, userId } });
    if (has) return;
    await this.members.save(
      this.members.create({ conversationId, userId, isAdmin: false }),
    );
  }

  /** Remove a user from a conversation. No-op if they aren't a member. */
  async removeMember(conversationId: string, userId: string): Promise<void> {
    await this.members.delete({ conversationId, userId });
  }

  /** Look up the group conversation bound to a trip, if any. */
  findByTripId(tripId: string): Promise<Conversation | null> {
    return this.convs.findOne({ where: { tripId } });
  }

  /** Convenience: ensure the trip group exists then add the user. */
  async addMemberByTripId(tripId: string, userId: string): Promise<void> {
    const conv = await this.findByTripId(tripId);
    if (!conv) return;
    await this.addMember(conv.id, userId);
  }

  /** Convenience: remove a user from the trip's group, if any. */
  async removeMemberByTripId(tripId: string, userId: string): Promise<void> {
    const conv = await this.findByTripId(tripId);
    if (!conv) return;
    await this.removeMember(conv.id, userId);
  }
}
