import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { DuelResult } from './entities/duel-result.entity';
import { Dictionary } from '../dictionary/entities/dictionary.entity';
import { Word } from '../word/entities/word.entity';

export interface QueuePlayer {
  userId: number;
  socketId: string;
  dictionaryIds: number[];
  language: string;
  winrate: number;
  username: string;
}

export interface DuelRound {
  wordId: number;
  text: string;
  options: string[];
  correctOption: string;
  timeLimit: number;
}

interface MatchPlayerState {
  userId: number;
  username: string;
  winrate: number;
  score: number;
  answeredRounds: Set<number>;
  roundStartTime: number;
}

interface ActiveMatch {
  roomId: string;
  language: string;
  rounds: DuelRound[];
  players: Record<number, MatchPlayerState>;
  playerIds: [number, number];
  finalizeTimer?: ReturnType<typeof setTimeout>;
}

@Injectable()
export class DuelService {
  private readonly logger = new Logger(DuelService.name);

  // language -> array of players in queue
  private queues: Record<string, QueuePlayer[]> = {};

  // roomId -> active match state
  private activeMatches = new Map<string, ActiveMatch>();

  private processedRooms = new Set<string>();

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(DuelResult) private duelResultRepo: Repository<DuelResult>,
    @InjectRepository(Dictionary) private dictRepo: Repository<Dictionary>,
    @InjectRepository(Word) private wordRepo: Repository<Word>,
  ) {}

  joinQueue(player: QueuePlayer) {
    if (!this.queues[player.language]) {
      this.queues[player.language] = [];
    }

    // Check if socket or user already in queue
    const existingIndex = this.queues[player.language].findIndex(
      (p) => p.socketId === player.socketId || p.userId === player.userId,
    );
    if (existingIndex >= 0) {
      this.queues[player.language][existingIndex] = player;
    } else {
      this.queues[player.language].push(player);
    }

    this.logger.log(
      `Player ${player.username} (ID: ${player.userId}) joined ${player.language} queue. Total: ${this.queues[player.language].length}`,
    );
    return this.checkForMatch(player.language);
  }

  leaveQueue(socketId: string) {
    for (const lang of Object.keys(this.queues)) {
      this.queues[lang] = this.queues[lang].filter((p) => p.socketId !== socketId);
    }
  }

  private checkForMatch(language: string) {
    const queue = this.queues[language];
    if (queue.length >= 2) {
      const player1 = queue.shift();
      const player2 = queue.shift();
      return [player1, player2];
    }
    return null;
  }

  async createMatch(player1: QueuePlayer, player2: QueuePlayer) {
    const roomId = `duel_${player1.userId}_${player2.userId}_${Date.now()}`;
    const rounds = await this.generateMatchWords(player1.dictionaryIds, player2.dictionaryIds);
    const initialRoundStart = Date.now() + 3000; // 3s intro animation

    const match: ActiveMatch = {
      roomId,
      language: player1.language || 'mixed',
      rounds,
      playerIds: [player1.userId, player2.userId],
      players: {
        [player1.userId]: {
          userId: player1.userId,
          username: player1.username,
          winrate: player1.winrate,
          score: 0,
          answeredRounds: new Set<number>(),
          roundStartTime: initialRoundStart,
        },
        [player2.userId]: {
          userId: player2.userId,
          username: player2.username,
          winrate: player2.winrate,
          score: 0,
          answeredRounds: new Set<number>(),
          roundStartTime: initialRoundStart,
        },
      },
    };

    this.activeMatches.set(roomId, match);
    return match;
  }

  isPlayerInMatch(roomId: string, userId: number): boolean {
    const match = this.activeMatches.get(roomId);
    if (!match) return false;
    return Boolean(match.players[userId]);
  }

  async submitAnswer(
    roomId: string,
    userId: number,
    roundIndex: number,
    selectedOption: string,
  ) {
    const match = this.activeMatches.get(roomId);
    if (!match) return null;

    const playerState = match.players[userId];
    if (!playerState) return null;

    if (roundIndex < 0 || roundIndex >= match.rounds.length) return null;
    if (playerState.answeredRounds.has(roundIndex)) return null;

    const round = match.rounds[roundIndex];
    const now = Date.now();
    const elapsed = Math.max(0, now - playerState.roundStartTime);
    const graceMs = 750; // network latency tolerance
    const isWithinTime = elapsed <= round.timeLimit + graceMs;
    const isCorrect = isWithinTime && selectedOption === round.correctOption;

    let pointsEarned = 0;
    if (isCorrect) {
      const effectiveElapsed = Math.min(round.timeLimit, elapsed);
      const timePercent = (round.timeLimit - effectiveElapsed) / round.timeLimit;
      pointsEarned = Math.round(50 + 50 * timePercent);
    }

    playerState.answeredRounds.add(roundIndex);
    playerState.score += pointsEarned;
    // Next round starts after 1.5s reveal delay
    playerState.roundStartTime = now + 1500;

    const [p1Id, p2Id] = match.playerIds;
    const p1State = match.players[p1Id];
    const p2State = match.players[p2Id];
    const totalRounds = match.rounds.length;

    const p1Done = p1State.answeredRounds.size >= totalRounds;
    const p2Done = p2State.answeredRounds.size >= totalRounds;
    const bothFinished = p1Done && p2Done;

    if (bothFinished) {
      if (match.finalizeTimer) {
        clearTimeout(match.finalizeTimer);
      }
      await this.finalizeMatch(roomId);
    } else if ((p1Done || p2Done) && !match.finalizeTimer) {
      // Safety timer in case the other player disconnected or went AFK
      match.finalizeTimer = setTimeout(() => {
        this.finalizeMatch(roomId).catch((err) =>
          this.logger.error(`Error finalizing match ${roomId}: ${err}`),
        );
      }, 15000);
    }

    return {
      roundIndex,
      pointsEarned,
      totalScore: playerState.score,
      isCorrect,
      correctOption: round.correctOption,
      bothFinished,
      scores: {
        [p1Id]: p1State.score,
        [p2Id]: p2State.score,
      },
    };
  }

  async finalizeMatch(roomId: string) {
    const match = this.activeMatches.get(roomId);
    if (!match) return;

    const [p1Id, p2Id] = match.playerIds;
    const p1 = match.players[p1Id];
    const p2 = match.players[p2Id];

    if (match.finalizeTimer) {
      clearTimeout(match.finalizeTimer);
    }
    this.activeMatches.delete(roomId);

    await this.saveMatchResult(
      roomId,
      { id: p1.userId, score: p1.score },
      { id: p2.userId, score: p2.score },
      match.language,
    );
  }

  async generateMatchWords(p1Dicts: number[], p2Dicts: number[]): Promise<DuelRound[]> {
    const allDicts = Array.from(new Set([...p1Dicts, ...p2Dicts]));

    const words = await this.wordRepo.find({
      where: { dictionaryId: In(allDicts) },
    });

    if (words.length < 4) {
      throw new Error('Not enough words in selected dictionaries');
    }

    const shuffle = <T>(array: T[]): T[] => {
      const result = [...array];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    };

    const mastered = shuffle(words.filter((w) => w.remembered === true));
    const learning = shuffle(words.filter((w) => w.remembered === false && w.interval > 0));
    const newWords = shuffle(words.filter((w) => w.remembered === false && w.interval === 0));

    let selectedWords: Word[] = [];

    const tryTake = (pool: Word[], count: number) => {
      const taken = pool.splice(0, count);
      selectedWords = [...selectedWords, ...taken];
      return count - taken.length;
    };

    let missing = 0;
    missing += tryTake(mastered, 3);
    missing += tryTake(learning, 4 + missing);
    missing += tryTake(newWords, 3 + missing);

    if (selectedWords.length < 10) {
      const remaining = shuffle([...mastered, ...learning, ...newWords]);
      tryTake(remaining, 10 - selectedWords.length);
    }

    const rounds = selectedWords.map((word, index) => {
      const wrongOptions = shuffle(words.filter((w) => w.translate !== word.translate))
        .slice(0, 3)
        .map((w) => w.translate);

      while (wrongOptions.length < 3) wrongOptions.push('...');

      const options = shuffle([word.translate, ...wrongOptions]);
      const timeLimit = index < 3 ? 8000 : index < 6 ? 5000 : 3000;

      return {
        wordId: word.id,
        text: word.text,
        options,
        correctOption: word.translate,
        timeLimit,
      };
    });

    return rounds;
  }

  async saveMatchResult(
    roomId: string,
    p1: { id: number; score: number },
    p2: { id: number; score: number },
    language: string = 'mixed',
  ) {
    if (this.processedRooms.has(roomId)) {
      return;
    }
    this.processedRooms.add(roomId);

    if (p1.score === p2.score) {
      // Draw: do not record a fake winner/loser or reset win streaks
      return;
    }

    let winnerId: number;
    let loserId: number;
    let winnerScore = 0;
    let loserScore = 0;

    if (p1.score > p2.score) {
      winnerId = p1.id;
      loserId = p2.id;
      winnerScore = p1.score;
      loserScore = p2.score;
    } else {
      winnerId = p2.id;
      loserId = p1.id;
      winnerScore = p2.score;
      loserScore = p1.score;
    }

    const result = this.duelResultRepo.create({
      winnerId,
      loserId,
      winnerScore,
      loserScore,
      language,
    });
    await this.duelResultRepo.save(result);

    const user1 = await this.userRepo.findOneBy({ id: p1.id });
    const user2 = await this.userRepo.findOneBy({ id: p2.id });

    if (user1 && user2) {
      if (p1.score > p2.score) {
        user1.duelWins = (user1.duelWins || 0) + 1;
        user2.duelLosses = (user2.duelLosses || 0) + 1;
        user1.currentWinStreak = (user1.currentWinStreak || 0) + 1;
        user2.currentWinStreak = 0;
        if (user1.currentWinStreak > (user1.bestWinStreak || 0)) {
          user1.bestWinStreak = user1.currentWinStreak;
        }
      } else if (p2.score > p1.score) {
        user2.duelWins = (user2.duelWins || 0) + 1;
        user1.duelLosses = (user1.duelLosses || 0) + 1;
        user2.currentWinStreak = (user2.currentWinStreak || 0) + 1;
        user1.currentWinStreak = 0;
        if (user2.currentWinStreak > (user2.bestWinStreak || 0)) {
          user2.bestWinStreak = user2.currentWinStreak;
        }
      }

      await this.userRepo.save([user1, user2]);
    }
  }
}
