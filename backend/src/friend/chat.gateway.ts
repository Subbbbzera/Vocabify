import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../user/entities/user.entity';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  private readonly activeUsers = new Map<number, Set<string>>();

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      let userId: number | null = null;

      const rawToken =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (rawToken) {
        try {
          const payload = this.jwtService.verify(rawToken);
          if (payload?.sub || payload?.id) {
            userId = payload.sub || payload.id;
          }
        } catch {

        }
      }

      if (!userId) {
        const rawId = client.handshake.auth?.userId || client.handshake.query?.userId;
        if (rawId) {
          const parsed = parseInt(String(rawId), 10);
          if (!isNaN(parsed)) userId = parsed;
        }
      }

      if (!userId) {
        this.logger.warn(`Unauthenticated socket connection rejected: ${client.id}`);
        client.disconnect();
        return;
      }

      client.data.userId = userId;

      if (!this.activeUsers.has(userId)) {
        this.activeUsers.set(userId, new Set());
      }
      this.activeUsers.get(userId)!.add(client.id);

      client.join(`user_${userId}`);

      client.emit('presence:init', {
        onlineUserIds: Array.from(this.activeUsers.keys()),
      });

      this.server.emit('presence:update', {
        userId,
        isOnline: true,
      });

      this.logger.log(`User ${userId} connected (socket ${client.id}). Total online: ${this.activeUsers.size}`);
    } catch (err) {
      this.logger.error(`Error handling socket connection: ${err}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (!userId) return;

    const userSockets = this.activeUsers.get(userId);
    if (userSockets) {
      userSockets.delete(client.id);

      if (userSockets.size === 0) {
        this.activeUsers.delete(userId);

        const lastSeen = new Date();

        await this.userRepo.update({ id: userId }, { lastSeen }).catch(() => null);

        this.server.emit('presence:update', {
          userId,
          isOnline: false,
          lastSeen: lastSeen.toISOString(),
        });

        this.logger.log(`User ${userId} disconnected. Total online: ${this.activeUsers.size}`);
      }
    }
  }

  @SubscribeMessage('chat:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { recipientId: number; isTyping: boolean },
  ) {
    const senderId = client.data?.userId;
    if (!senderId || !data?.recipientId) return;

    this.server.to(`user_${data.recipientId}`).emit('chat:typing', {
      senderId,
      isTyping: Boolean(data.isTyping),
    });
  }

  emitNewMessage(recipientId: number, message: any) {
    this.server.to(`user_${recipientId}`).emit('message:new', message);
  }

  emitMessageEdited(recipientId: number, message: any) {
    this.server.to(`user_${recipientId}`).emit('message:edited', message);
  }

  emitMessageDeleted(recipientId: number, messageId: number) {
    this.server.to(`user_${recipientId}`).emit('message:deleted', { messageId });
  }

  emitMessageReaction(recipientId: number, messageId: number, reactions: Record<string, number[]>) {
    this.server.to(`user_${recipientId}`).emit('message:reaction', { messageId, reactions });
  }

  isUserOnline(userId: number): boolean {
    const sockets = this.activeUsers.get(userId);
    return Boolean(sockets && sockets.size > 0);
  }

  getOnlineUserIds(): number[] {
    return Array.from(this.activeUsers.keys());
  }
}
