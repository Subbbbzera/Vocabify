import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { WordService } from './word.service';
import { Word } from './entities/word.entity';
import { Dictionary } from '../dictionary/entities/dictionary.entity';

describe('WordService', () => {
  let service: WordService;
  let wordRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let dictRepo: {
    findOne: jest.Mock;
  };

  beforeEach(async () => {
    wordRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    dictRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WordService,
        {
          provide: getRepositoryToken(Word),
          useValue: wordRepo,
        },
        {
          provide: getRepositoryToken(Dictionary),
          useValue: dictRepo,
        },
      ],
    }).compile();

    service = module.get<WordService>(WordService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWord', () => {
    it('should group words by the first uppercase letter', async () => {
      wordRepo.find.mockResolvedValue([
        { id: 1, text: 'apple' },
        { id: 2, text: 'avocado' },
        { id: 3, text: 'banana' },
      ]);

      const result = await service.getWord(10);

      expect(wordRepo.find).toHaveBeenCalledWith({
        where: { dictionaryId: 10 },
        order: { text: 'ASC' },
      });
      expect(result).toHaveProperty('A');
      expect(result).toHaveProperty('B');
      expect(result['A']).toHaveLength(2);
      expect(result['B']).toHaveLength(1);
    });

    it('should place words with empty text under "#" key', async () => {
      wordRepo.find.mockResolvedValue([{ id: 1, text: '' }]);

      const result = await service.getWord(10);

      expect(result['#']).toHaveLength(1);
    });
  });

  describe('saveWord', () => {
    it('should throw ForbiddenException if dictionary is not found', async () => {
      dictRepo.findOne.mockResolvedValue(null);

      await expect(
        service.saveWord({
          dictionaryId: 99,
          text: 'hello',
          translation: 'привіт',
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create and save word if dictionary exists', async () => {
      const mockDict = { dictionaryId: 1, title: 'English' };
      const dto = { dictionaryId: 1, text: 'cat', translation: 'кіт' };
      const mockCreated = { id: 10, ...dto };

      dictRepo.findOne.mockResolvedValue(mockDict);
      wordRepo.create.mockReturnValue(mockCreated);
      wordRepo.save.mockResolvedValue(mockCreated);

      const result = await service.saveWord(dto as any);

      expect(dictRepo.findOne).toHaveBeenCalledWith({
        where: { dictionaryId: 1 },
        relations: ['user'],
      });
      expect(wordRepo.create).toHaveBeenCalledWith(dto);
      expect(wordRepo.save).toHaveBeenCalledWith(mockCreated);
      expect(result).toEqual(mockCreated);
    });
  });

  describe('verifyWordOwnership (via getWordById)', () => {
    it('should throw NotFoundException if word does not exist', async () => {
      wordRepo.findOne.mockResolvedValue(null);

      await expect(service.getWordById(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if word belongs to another user', async () => {
      wordRepo.findOne.mockResolvedValue({
        id: 1,
        dictionary: {
          user: { id: 2 },
        },
      });

      await expect(service.getWordById(1, 1)).rejects.toThrow(ForbiddenException);
    });

    it('should return word details with language if user is owner', async () => {
      const mockWord = {
        id: 1,
        text: 'dog',
        dictionary: {
          language: 'en',
          user: { id: 1 },
        },
      };

      wordRepo.findOne.mockResolvedValue(mockWord);

      const result = await service.getWordById(1, 1);

      expect(result.id).toBe(1);
      expect(result.language).toBe('en');
    });
  });
});
