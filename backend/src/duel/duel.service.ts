import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { DuelResult } from './entities/duel-result.entity';
import { Dictionary } from '../dictionary/entities/dictionary.entity';
import { Word } from '../word/entities/word.entity';

interface QueuePlayer {
  userId: number;
  socketId: string;
  dictionaryIds: number[];
  language: string;
  winrate: number;
  username: string;
}

@Injectable()
export class DuelService {
  private readonly logger = new Logger(DuelService.name);
  
  // language -> array of players in queue
  private queues: Record<string, QueuePlayer[]> = {};

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
    
    // Check if socket already in queue
    const existingIndex = this.queues[player.language].findIndex(p => p.socketId === player.socketId);
    if (existingIndex >= 0) {
      this.queues[player.language][existingIndex] = player;
    } else {
      this.queues[player.language].push(player);
    }
    
    this.logger.log(`Player ${player.username} joined ${player.language} queue. Total: ${this.queues[player.language].length}`);
    return this.checkForMatch(player.language);
  }

  leaveQueue(socketId: string) {
    for (const lang of Object.keys(this.queues)) {
      this.queues[lang] = this.queues[lang].filter(p => p.socketId !== socketId);
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

  async generateMatchWords(p1Dicts: number[], p2Dicts: number[]) {
    const { In } = await import('typeorm');
    const allDicts = Array.from(new Set([...p1Dicts, ...p2Dicts]));
    
    const words = await this.wordRepo.find({
      where: { dictionaryId: In(allDicts) },
    });

    if (words.length < 4) {
      throw new Error('Not enough words in selected dictionaries');
    }

    // Розділяємо слова по складності
    const mastered = words.filter(w => w.remembered === true);
    const learning = words.filter(w => w.remembered === false && w.interval > 0);
    const newWords = words.filter(w => w.remembered === false && w.interval === 0);

    // Функція для перемішування масиву
    const shuffle = (array: any[]) => array.sort(() => 0.5 - Math.random());

    shuffle(mastered);
    shuffle(learning);
    shuffle(newWords);

    // Намагаємось взяти 3 засвоєні, 4 вивчаються, 3 нові (якщо не вистачає - добираємо з інших)
    let selectedWords: Word[] = [];
    
    const tryTake = (pool: Word[], count: number) => {
      const taken = pool.splice(0, count);
      selectedWords = [...selectedWords, ...taken];
      return count - taken.length; // скільки ще не вистачає
    };

    let missing = 0;
    missing += tryTake(mastered, 3);
    missing += tryTake(learning, 4 + missing);
    missing += tryTake(newWords, 3 + missing);
    
    // Якщо все ще не вистачає до 10, добираємо з залишків
    if (selectedWords.length < 10) {
      const remaining = [...mastered, ...learning, ...newWords];
      shuffle(remaining);
      tryTake(remaining, 10 - selectedWords.length);
    }

    // Створюємо раунди
    const rounds = selectedWords.map((word, index) => {
      // 3 неправильні варіанти
      const wrongOptions = shuffle(words.filter(w => w.translate !== word.translate))
        .slice(0, 3)
        .map(w => w.translate);
      
      // Якщо у нас менше 4 унікальних слів взагалі, просто дублюємо (edge case)
      while (wrongOptions.length < 3) wrongOptions.push('...');

      const options = shuffle([word.translate, ...wrongOptions]);

      // Раунди 1-3: 8 сек, 4-6: 5 сек, 7-10: 3 сек
      const timeLimit = index < 3 ? 8000 : index < 6 ? 5000 : 3000;

      return {
        wordId: word.id,
        text: word.text,
        options,
        correctOption: word.translate,
        timeLimit
      };
    });

    return rounds;
  }

  private processedRooms = new Set<string>();

  async saveMatchResult(roomId: string, p1: { id: number; score: number }, p2: { id: number; score: number }) {
    if (this.processedRooms.has(roomId)) {
      return; // Вже збережено
    }
    this.processedRooms.add(roomId);

    // Визначаємо переможця
    let winnerId: number | null = null;
    let loserId: number | null = null;
    let winnerScore = 0;
    let loserScore = 0;

    if (p1.score > p2.score) {
      winnerId = p1.id; loserId = p2.id;
      winnerScore = p1.score; loserScore = p2.score;
    } else if (p2.score > p1.score) {
      winnerId = p2.id; loserId = p1.id;
      winnerScore = p2.score; loserScore = p1.score;
    } else {
      // Нічия, просто записуємо когось як переможця для DuelResult (або залишаємо)
      winnerId = p1.id; loserId = p2.id;
      winnerScore = p1.score; loserScore = p2.score;
    }

    // Зберігаємо історію дуелі
    const result = this.duelResultRepo.create({
      winnerId,
      loserId,
      winnerScore,
      loserScore,
      language: 'mixed', // Або можна передавати реальну мову
    });
    await this.duelResultRepo.save(result);

    // Оновлюємо статистику гравців
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
      // Нічия - нічого не змінюємо (або можна скидати стрік)

      await this.userRepo.save([user1, user2]);
    }
  }
}
