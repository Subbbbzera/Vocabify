import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DuelService } from './duel.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ namespace: '/duel', cors: { origin: '*' } })
export class DuelGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DuelGateway.name);

  constructor(private readonly duelService: DuelService) {}

  handleConnection(client: Socket) {
    this.logger.log(`[DUEL] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[DUEL] Client disconnected: ${client.id}`);
    this.duelService.leaveQueue(client.id);
  }

  @SubscribeMessage('join_duel_queue')
  async handleJoinQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: number; username: string; dictionaryIds: number[]; language: string; winrate: number },
  ) {
    const match = this.duelService.joinQueue({
      ...data,
      socketId: client.id,
    });

    if (match) {
      const [player1, player2] = match;
      if (!player1 || !player2) return;
      const roomId = `duel_${player1.userId}_${player2.userId}_${Date.now()}`;
      
      // In Socket.IO each socketId is automatically a room, so no need to look up socket objects
      try {
        // Join both players into the room
        this.server.in(player1.socketId).socketsJoin(roomId);
        this.server.in(player2.socketId).socketsJoin(roomId);

        const rounds = await this.duelService.generateMatchWords(
          player1.dictionaryIds, 
          player2.dictionaryIds
        );

        this.logger.log(`[DUEL] Match created: ${roomId}, rounds: ${rounds.length}`);

        // Let them know match is found
        this.server.to(roomId).emit('match_found', {
          roomId,
          players: [
            { userId: player1.userId, username: player1.username, winrate: player1.winrate },
            { userId: player2.userId, username: player2.username, winrate: player2.winrate }
          ],
          rounds
        });
      } catch (error) {
        this.logger.error(`[DUEL] Match error: ${error}`);
        this.server.to(player1.socketId).emit('match_error', { message: 'Недостатньо слів у вибраних словниках для початку дуелі.' });
        this.server.to(player2.socketId).emit('match_error', { message: 'Недостатньо слів у вибраних словниках для початку дуелі.' });
      }
    }
  }

  @SubscribeMessage('leave_duel_queue')
  handleLeaveQueue(@ConnectedSocket() client: Socket) {
    this.duelService.leaveQueue(client.id);
  }

  @SubscribeMessage('duel_score_update')
  handleScoreUpdate(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string, userId: number, score: number }) {
    // Відправляємо бали всім у кімнаті, окрім того, хто відправив
    client.to(data.roomId).emit('opponent_scored', { score: data.score, userId: data.userId });
  }

  @SubscribeMessage('rejoin_duel')
  handleRejoinDuel(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    this.logger.log(`[DUEL] Client ${client.id} rejoining room ${data.roomId}`);
    client.join(data.roomId);
  }

  @SubscribeMessage('leave_duel')
  handleLeaveDuel(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    client.leave(data.roomId);
  }

  @SubscribeMessage('duel_end')
  async handleDuelEnd(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string, player1: { id: number, score: number }, player2: { id: number, score: number } }) {
    try {
      await this.duelService.saveMatchResult(data.roomId, data.player1, data.player2);
    } catch (e) {
      this.logger.error(`Error saving match result: ${e}`);
    }
  }
}
