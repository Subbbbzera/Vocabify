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

  private async verifyWordOwnership(wordId: number, userId?: number): Promise<Word> {
    const word = await this.wordRepo.findOne({
      where: { id: wordId },
      relations: ['dictionary', 'dictionary.user'],
    });

    if (!word) {
      throw new NotFoundException(`Word with ID ${wordId} not found`);
    }

    if (userId && word.dictionary?.user?.id && word.dictionary.user.id !== userId) {
      throw new ForbiddenException('You do not have access to this word');
    }

    return word;
  }

  async getWord(dictionaryId: number, userId?: number) {
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

    if (!dictionary) {
      throw new ForbiddenException('Dictionary not found or access denied');
    }

    const newWord = this.wordRepo.create(dto);
    const savedWord = await this.wordRepo.save(newWord);

    return savedWord;
  }

  async getWordById(id: number, userId: number) {
    const word = await this.verifyWordOwnership(id, userId);
    return {
      ...word,
      language: word.dictionary?.language,
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

  async addExample(id: number, example: any, userId: number) {
    const word = await this.verifyWordOwnership(id, userId);
    const examples = word.examples || [];
    examples.push(example);
    word.examples = examples;
    return this.wordRepo.save(word);
  }

  async updateExample(id: number, index: number, example: any, userId: number) {
    const word = await this.verifyWordOwnership(id, userId);
    if (word.examples && word.examples.length > index) {
      word.examples[index] = example;
      return this.wordRepo.save(word);
    }
    return word;
  }

  async deleteExample(id: number, index: number, userId: number) {
    const word = await this.verifyWordOwnership(id, userId);
    if (word.examples && word.examples.length > index) {
      word.examples.splice(index, 1);
      return this.wordRepo.save(word);
    }
    return word;
  }
}
