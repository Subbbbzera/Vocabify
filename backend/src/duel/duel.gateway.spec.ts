import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { DuelGateway } from './duel.gateway';
import { DuelService } from './duel.service';

describe('DuelGateway', () => {
  let gateway: DuelGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DuelGateway,
        {
          provide: DuelService,
          useValue: {
            leaveQueue: jest.fn(),
            joinQueue: jest.fn(),
            getPlayerQueueProfile: jest.fn(),
            createMatch: jest.fn(),
            submitAnswer: jest.fn(),
            isPlayerInMatch: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<DuelGateway>(DuelGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
