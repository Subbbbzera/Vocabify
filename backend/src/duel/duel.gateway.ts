import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DuelService } from './duel.service';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ namespace: '/duel', cors: { origin: '*' } })
export class DuelGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DuelGateway.name);

  constructor(
    private readonly duelService: DuelService,
    private readonly jwtService: JwtService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const rawToken =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!rawToken) {
        this.logger.warn(`[DUEL] Unauthenticated connection rejected: ${client.id}`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(rawToken);
      const userId = Number(payload?.sub || payload?.id);

      if (!userId || isNaN(userId)) {
        this.logger.warn(`[DUEL] Invalid token payload for socket: ${client.id}`);
        client.disconnect();
        return;
      }

      client.data.userId = userId;
      this.logger.log(`[DUEL] Client connected: ${client.id} (userId: ${userId})`);
    } catch {
      this.logger.warn(`[DUEL] Invalid JWT token for socket: ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[DUEL] Client disconnected: ${client.id}`);
    this.duelService.leaveQueue(client.id);
  }

  @SubscribeMessage('join_duel_queue')
  async handleJoinQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      userId?: number;
      username: string;
      dictionaryIds: number[];
      language: string;
      winrate: number;
    },
  ) {
    const userId = client.data?.userId;
    if (!userId) {
      client.disconnect();
      return;
    }

    const match = this.duelService.joinQueue({
      ...data,
      userId,
      socketId: client.id,
    });

    if (match) {
      const [player1, player2] = match;
      if (!player1 || !player2) return;

      try {
        const activeMatch = await this.duelService.createMatch(player1, player2);
        const { roomId, rounds } = activeMatch;

        this.server.in(player1.socketId).socketsJoin(roomId);
        this.server.in(player2.socketId).socketsJoin(roomId);

        this.logger.log(`[DUEL] Match created: ${roomId}, rounds: ${rounds.length}`);

        const sanitizedRounds = rounds.map(({ correctOption: _, ...round }) => round);

        this.server.to(roomId).emit('match_found', {
          roomId,
          players: [
            { userId: player1.userId, username: player1.username, winrate: player1.winrate },
            { userId: player2.userId, username: player2.username, winrate: player2.winrate },
          ],
          rounds: sanitizedRounds,
        });
      } catch (error) {
        this.logger.error(`[DUEL] Match error: ${error}`);
        const errorMessage = 'Not enough words in the selected dictionaries to start a duel.';
        this.server.to(player1.socketId).emit('match_error', { message: errorMessage });
        this.server.to(player2.socketId).emit('match_error', { message: errorMessage });
      }
    }
  }

  @SubscribeMessage('leave_duel_queue')
  handleLeaveQueue(@ConnectedSocket() client: Socket) {
    this.duelService.leaveQueue(client.id);
  }

  @SubscribeMessage('submit_answer')
  async handleSubmitAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { roomId: string; roundIndex: number; selectedOption: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !data?.roomId) return;

    const result = await this.duelService.submitAnswer(
      data.roomId,
      userId,
      Number(data.roundIndex),
      String(data.selectedOption ?? ''),
    );

    if (!result) return;

    client.emit('answer_result', {
      roundIndex: result.roundIndex,
      pointsEarned: result.pointsEarned,
      totalScore: result.totalScore,
      isCorrect: result.isCorrect,
      correctOption: result.correctOption,
    });

    client.to(data.roomId).emit('opponent_scored', {
      score: result.pointsEarned,
      totalScore: result.totalScore,
      userId,
    });
  }

  @SubscribeMessage('rejoin_duel')
  handleRejoinDuel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !data?.roomId) return;
    if (!this.duelService.isPlayerInMatch(data.roomId, userId)) return;

    this.logger.log(`[DUEL] Client ${client.id} (user ${userId}) rejoining room ${data.roomId}`);
    client.join(data.roomId);
  }

  @SubscribeMessage('leave_duel')
  handleLeaveDuel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    if (data?.roomId) {
      client.leave(data.roomId);
    }
  }
}
