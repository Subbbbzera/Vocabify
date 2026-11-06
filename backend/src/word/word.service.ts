import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Dictionary } from '../dictionary/entities/dictionary.entity';
import { Word } from './entities/word.entity';
import { Repository } from 'typeorm';
import { CreateWordDto, UpdateWordDto } from './dto/word.dto';

@Injectable()
export class WordService {
  constructor(
    @InjectRepository(Word)
    private readonly wordRepo: Repository<Word>,

    @InjectRepository(Dictionary)
    private readonly dictRepo: Repository<Dictionary>,
  ) {}

  private async verifyWordOwnership(
    wordId: number,
    userId?: number,
    allowPublicRead = false,
  ): Promise<Word> {
    const word = await this.wordRepo.findOne({
      where: { id: wordId },
      relations: ['dictionary', 'dictionary.user'],
    });

    if (!word) {
      throw new NotFoundException(`Word with ID ${wordId} not found`);
    }

    const isOwner = !userId || !word.dictionary?.user?.id || word.dictionary.user.id === userId;
    const isPublicAllowed = allowPublicRead && word.dictionary?.isPublic === true;

    if (!isOwner && !isPublicAllowed) {
      throw new ForbiddenException('You do not have access to this word');
    }

    return word;
  }

  async getWord(dictionaryId: number, userId?: number) {
    if (userId) {
      const dictionary = await this.dictRepo.findOne({
        where: [
          { dictionaryId, user: { id: userId } },
          { dictionaryId, isPublic: true },
        ],
      });

      if (!dictionary) {
        throw new ForbiddenException('Dictionary not found or access denied');
      }
    }

    const words = await this.wordRepo.find({
      where: { dictionaryId },
      order: { text: 'ASC' },
    });

    const stackWords: Record<string, Word[]> = {};
    for (const w of words) {
      const firstLetter = (w.text || '').trim().slice(0, 1).toUpperCase() || '#';
      if (!stackWords[firstLetter]) {
        stackWords[firstLetter] = [];
      }
      stackWords[firstLetter].push(w);
    }
    return stackWords;
  }

  async saveWord(dto: CreateWordDto, userId?: number) {
    const dictionary = await this.dictRepo.findOne({
      where: { dictionaryId: dto.dictionaryId },
      relations: ['user'],
    });

    if (!dictionary || (userId && dictionary.user?.id && dictionary.user.id !== userId)) {
      throw new ForbiddenException('Dictionary not found or access denied');
    }

    const newWord = this.wordRepo.create(dto);
    const savedWord = await this.wordRepo.save(newWord);

    return savedWord;
  }

  async getWordById(id: number, userId: number) {
    const word = await this.verifyWordOwnership(id, userId, true);
    const { dictionary, ...wordData } = word;
    return {
      ...wordData,
      language: dictionary?.language,
    };
  }

  async updateWord(id: number, dto: UpdateWordDto, userId: number) {
    await this.verifyWordOwnership(id, userId);
    await this.wordRepo.update(id, dto);
    return this.getWordById(id, userId);
  }

  async deleteWord(id: number, userId: number) {
    await this.verifyWordOwnership(id, userId);
    await this.wordRepo.delete(id);
    return { message: 'Word deleted successfully', id };
  }

  async resetDictionaryWords(dictionaryId: number, userId: number) {
    const dictionary = await this.dictRepo.findOne({
      where: { dictionaryId, user: { id: userId } },
    });

    if (!dictionary) {
      throw new ForbiddenException('Dictionary not found or access denied');
    }

    await this.wordRepo.update(
      { dictionaryId },
      {
        remembered: false,
        interval: 0,
        nextReviewDate: null,
      },
    );

    return { message: 'Dictionary progress reset successfully', dictionaryId };
  }

  async addExample(id: number, example: string, userId: number) {
    const word = await this.verifyWordOwnership(id, userId);
    const examples = word.examples || [];
    examples.push(example);
    word.examples = examples;
    return this.wordRepo.save(word);
  }

  async updateExample(id: number, index: number, example: string, userId: number) {
    const word = await this.verifyWordOwnership(id, userId);
    if (word.examples && index >= 0 && word.examples.length > index) {
      word.examples[index] = example;
      return this.wordRepo.save(word);
    }
    return word;
  }

  async deleteExample(id: number, index: number, userId: number) {
    const word = await this.verifyWordOwnership(id, userId);
    if (word.examples && index >= 0 && word.examples.length > index) {
      word.examples.splice(index, 1);
      return this.wordRepo.save(word);
    }
    return word;
  }
}
