import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DuelService } from './duel.service';
import { User } from '../user/entities/user.entity';
import { DuelResult } from './entities/duel-result.entity';
import { Dictionary } from '../dictionary/entities/dictionary.entity';
import { Word } from '../word/entities/word.entity';

describe('DuelService', () => {
  let service: DuelService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DuelService,
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(DuelResult), useValue: {} },
        { provide: getRepositoryToken(Dictionary), useValue: {} },
        { provide: getRepositoryToken(Word), useValue: {} },
      ],
    }).compile();

    service = module.get<DuelService>(DuelService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
