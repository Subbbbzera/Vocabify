import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Dictionary } from './entities/dictionary.entity';
import { Word } from '../word/entities/word.entity';
import { Repository } from 'typeorm';
import { DictionaryDto, ImportDictionaryDto } from './dto/dictionary.dto';

@Injectable()
export class DictionaryService {
  constructor(
    @InjectRepository(Dictionary)
    private readonly dictionaryRepo: Repository<Dictionary>,

    @InjectRepository(Word)
    private readonly wordRepo: Repository<Word>,
  ) {}

  async createDictionary(dto: DictionaryDto, userId: number): Promise<Dictionary> {
    const newDictionary = this.dictionaryRepo.create({
      ...dto,
      user: { id: userId },
    });

    return this.dictionaryRepo.save(newDictionary);
  }

  async getDictionaries(userId: number) {
    const dictionaries = await this.dictionaryRepo.find({
      where: userId ? [{ user: { id: userId } }, { user: null as any }] : {},
      order: {
        isPinned: 'DESC',
        dictionaryId: 'DESC',
      },
    });

    if (dictionaries.length === 0) return [];

    const counts = await this.wordRepo
      .createQueryBuilder('word')
      .innerJoin('dictionary', 'dict', 'word.dictionaryId = dict.dictionaryId')
      .where('dict.userId = :userId', { userId })
      .select('word.dictionaryId', 'id')
      .addSelect('COUNT(*)', 'count')
      .addSelect(
        'SUM(CASE WHEN word.remembered = true THEN 1 ELSE 0 END)',
        'rememberedCount',
      )
      .groupBy('word.dictionaryId')
      .getRawMany();

    const countMap = Object.fromEntries(
      counts.map((c) => {
        const dictId = c.id || c.dictionaryId || c.dictionaryid || c.ID;
        return [
          dictId,
          {
            count: Number(c.count),
            rememberedCount: Number(c.rememberedCount || 0),
          },
        ];
      }),
    );

    return dictionaries.map((d) => ({
      ...d,
      amountWord: countMap[d.dictionaryId]?.count || 0,
      rememberedWords: countMap[d.dictionaryId]?.rememberedCount || 0,
    }));
  }

  async getDictionaryById(id: number, userId: number) {
    const dictionary = await this.dictionaryRepo.findOne({
      where: [
        { dictionaryId: id, user: { id: userId } },
        { dictionaryId: id, isPublic: true }
      ],
      relations: ['user']
    });

    if (!dictionary) {
      throw new NotFoundException(`Dictionary with ID ${id} not found`);
    }

    const count = await this.wordRepo.count({
      where: { dictionaryId: dictionary.dictionaryId },
    });
    const rememberedCount = await this.wordRepo.count({
      where: { dictionaryId: dictionary.dictionaryId, remembered: true },
    });

    return {
      ...dictionary,
      amountWord: count,
      rememberedWords: rememberedCount,
    };
  }

  async updateDictionary(id: number, dto: Partial<DictionaryDto>, userId: number) {
    const dictionary = await this.dictionaryRepo.findOne({
      where: { dictionaryId: id, user: { id: userId } },
    });

    if (!dictionary) {
      throw new NotFoundException(`Dictionary with ID ${id} not found`);
    }

    Object.assign(dictionary, dto);
    await this.dictionaryRepo.save(dictionary);

    return this.getDictionaryById(id, userId);
  }

  async importDictionary(data: ImportDictionaryDto, userId: number) {
    const { words, ...dictionaryData } = data;
    const newDictionary = this.dictionaryRepo.create({
      ...dictionaryData,
      isImported: true,
      user: { id: userId },
    });

    const savedDictionary = await this.dictionaryRepo.save(newDictionary);

    if (words && words.length > 0) {
      const wordsToSave = this.wordRepo.create(
        words.map((w: any) => ({
          ...w,
          dictionaryId: savedDictionary.dictionaryId,
        })),
      );
      await this.wordRepo.save(wordsToSave);
    }

    return savedDictionary;
  }

  async deleteDictionary(id: number, userId: number) {
    const dictionary = await this.dictionaryRepo.findOne({
      where: { dictionaryId: id, user: { id: userId } },
    });

    if (!dictionary) {
      throw new NotFoundException(`Dictionary with ID ${id} not found`);
    }

    await this.wordRepo.delete({ dictionaryId: id });
    await this.dictionaryRepo.delete({ dictionaryId: id });
    return { message: 'Dictionary deleted successfully', id };
  }

  async copyDictionary(id: number, userId: number) {
    const original = await this.dictionaryRepo.findOne({
      where: { dictionaryId: id },
      relations: ['user']
    });

    if (!original) {
      throw new NotFoundException(`Dictionary with ID ${id} not found`);
    }

    const { dictionaryId: _, user: __, isPublic: ___, views: ____, viewers: _v, averageRating: _____, totalRatings: ______, ratingsMap: _______, ...copyData } = original;
    const newDict = this.dictionaryRepo.create({
      ...copyData,
      dictionaryName: `${original.dictionaryName} - copy`,
      user: { id: userId },
      isPublic: false,
      views: 0,
      viewers: [],
      averageRating: 0,
      totalRatings: 0,
      ratingsMap: {}
    });
    const savedDict = await this.dictionaryRepo.save(newDict);

    const words = await this.wordRepo.find({
      where: { dictionaryId: id },
    });

    if (words.length > 0) {
      const wordsToCopy = this.wordRepo.create(
        words.map((w) => {
          const { id: __, ...wordData } = w;
          return {
            ...wordData,
            dictionaryId: savedDict.dictionaryId,
          };
        }),
      );
      await this.wordRepo.save(wordsToCopy);
    }

    return savedDict;
  }

  async getWordsGrouped(dictionaryId: number, userId: number) {

    const dictionary = await this.dictionaryRepo.findOne({
      where: { dictionaryId, user: { id: userId } },
    });

    if (!dictionary) {
      throw new NotFoundException(`Dictionary with ID ${dictionaryId} not found`);
    }

    const words = await this.wordRepo.find({
      where: { dictionaryId },
      order: { text: 'ASC' },
    });

    const stackWords: Record<string, Word[]> = {};

    for (const word of words) {
      const firstLetter = (word.text || '').trim().slice(0, 1).toUpperCase() || '#';

      if (!stackWords[firstLetter]) {
        stackWords[firstLetter] = [];
      }
      stackWords[firstLetter].push(word);
    }

    return stackWords;
  }

  async getStats(userId: number) {
    const totalDictionaries = await this.dictionaryRepo.count({
      where: { user: { id: userId } },
    });

    const totalWords = await this.wordRepo
      .createQueryBuilder('word')
      .innerJoin('dictionary', 'dict', 'word.dictionaryId = dict.dictionaryId')
      .where('dict.userId = :userId', { userId })
      .getCount();

    const learnedWords = await this.wordRepo
      .createQueryBuilder('word')
      .innerJoin('dictionary', 'dict', 'word.dictionaryId = dict.dictionaryId')
      .where('dict.userId = :userId', { userId })
      .andWhere('word.remembered = true')
      .getCount();

    return { totalDictionaries, totalWords, learnedWords };
  }

  async Getdictionary(userId: any) {
    return this.getDictionaries(Number(userId));
  }

  async InnerD(id: any) {
    return this.getDictionaryById(Number(id), 1);
  }

  async getSuggestedDictionaries(userId: number) {
    // Get all public dictionaries not belonging to this user
    const publicDicts = await this.dictionaryRepo.find({
      where: { isPublic: true },
      relations: ['user']
    });
    
    const othersDicts = publicDicts.filter(d => d.user && d.user.id !== userId);
    
    // Get current user's dictionaries to find their preferred tags
    const userDicts = await this.dictionaryRepo.find({
      where: { user: { id: userId } }
    });
    
    const userTags = new Set<string>();
    userDicts.forEach(d => {
      if (d.tags && Array.isArray(d.tags)) {
        d.tags.forEach(t => userTags.add(t.toLowerCase().trim()));
      }
    });

    const withScores = othersDicts.map(d => {
      let score = 0;
      if (d.tags && Array.isArray(d.tags)) {
        d.tags.forEach(t => {
          if (userTags.has(t.toLowerCase().trim())) score++;
        });
      }
      return { ...d, matchScore: score };
    });

    // Sort by match score descending
    withScores.sort((a, b) => b.matchScore - a.matchScore);

    // Map counts
    const dictIds = withScores.map(d => d.dictionaryId);
    if (dictIds.length === 0) return [];

    const counts = await this.wordRepo
      .createQueryBuilder('word')
      .where('word.dictionaryId IN (:...ids)', { ids: dictIds })
      .select('word.dictionaryId', 'id')
      .addSelect('COUNT(*)', 'count')
      .groupBy('word.dictionaryId')
      .getRawMany();

    const countMap = Object.fromEntries(
      counts.map((c) => [Number(c.id), Number(c.count)]),
    );

    // Only return dictionaries that have words in them
    return withScores
      .filter(d => (countMap[d.dictionaryId] || 0) > 0)
      .map(d => {
        const { user, matchScore, ...rest } = d;
        return {
          ...rest,
          amountWord: countMap[d.dictionaryId] || 0,
          authorName: user?.name || 'Unknown',
        };
      });
  }

  async incrementViews(id: number, userId: number) {
    const dictionary = await this.dictionaryRepo.findOne({ where: { dictionaryId: id } });
    if (dictionary) {
      if (!dictionary.viewers) dictionary.viewers = [];
      if (!dictionary.viewers.map(String).includes(String(userId))) {
        dictionary.viewers.push(userId);
        dictionary.views = dictionary.viewers.length;
        await this.dictionaryRepo.save(dictionary);
      }
    }
  }

  async rateDictionary(id: number, stars: number, userId: number) {
    const dictionary = await this.dictionaryRepo.findOne({ where: { dictionaryId: id } });
    if (!dictionary) throw new NotFoundException('Dictionary not found');

    if (!dictionary.ratingsMap) dictionary.ratingsMap = {};
    
    const existingRating = dictionary.ratingsMap[userId];
    dictionary.ratingsMap[userId] = stars;

    const ratings = Object.values(dictionary.ratingsMap);
    dictionary.totalRatings = ratings.length;
    const sum = ratings.reduce((acc, curr) => acc + curr, 0);
    dictionary.averageRating = sum / dictionary.totalRatings;

    await this.dictionaryRepo.save(dictionary);
    return dictionary;
  }
}
