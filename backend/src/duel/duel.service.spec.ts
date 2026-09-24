import { Test, TestingModule } from '@nestjs/testing';
import { DuelService } from './duel.service';

describe('DuelService', () => {
  let service: DuelService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DuelService],
    }).compile();

    service = module.get<DuelService>(DuelService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
