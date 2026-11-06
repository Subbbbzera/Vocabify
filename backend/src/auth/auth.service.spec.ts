import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from '../user/entities/user.entity';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let queryBuilder: {
    where: jest.Mock;
    getOne: jest.Mock;
  };
  let userRepo: {
    createQueryBuilder: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    findOneBy: jest.Mock;
  };
  let jwtService: {
    sign: jest.Mock;
  };

  beforeEach(async () => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    userRepo = {
      createQueryBuilder: jest.fn(() => queryBuilder),
      create: jest.fn(),
      save: jest.fn(),
      findOneBy: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should throw ConflictException if user with email already exists', async () => {
      userRepo.findOneBy.mockResolvedValue({ id: 1, email: 'test@example.com' });

      await expect(
        service.register({
          name: 'John Doe',
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create and return user with token when registration is valid', async () => {
      userRepo.findOneBy.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const mockSavedUser = {
        id: 1,
        name: 'John Doe',
        email: 'test@example.com',
        password: 'hashed-password',
      };

      userRepo.create.mockReturnValue(mockSavedUser);
      userRepo.save.mockResolvedValue(mockSavedUser);

      const result = await service.register({
        name: 'John Doe',
        email: 'test@example.com',
        password: 'password123',
      });

      expect(userRepo.create).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'test@example.com',
        password: 'hashed-password',
      });
      expect(result.token).toBe('mock-jwt-token');
      expect(result.user).toEqual({
        id: 1,
        name: 'John Doe',
        email: 'test@example.com',
      });
      expect(result.user).not.toHaveProperty('password');
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user is not found', async () => {
      userRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'nonexistent@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      userRepo.findOneBy.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        password: 'hashed-password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return token and user without password on successful login', async () => {
      const mockUser = {
        id: 1,
        name: 'John Doe',
        email: 'test@example.com',
        password: 'hashed-password',
        streakCount: 0,
        lastPracticeDate: null,
      };

      userRepo.findOneBy.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      userRepo.save.mockResolvedValue(mockUser);

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.token).toBe('mock-jwt-token');
      expect(result.user).toEqual({
        id: 1,
        name: 'John Doe',
        email: 'test@example.com',
        streakCount: 1,
        lastPracticeDate: expect.any(Date),
      });
      expect(result.user).not.toHaveProperty('password');
    });
  });

  describe('getProfile', () => {
    it('should throw NotFoundException when user does not exist', async () => {
      userRepo.findOneBy.mockResolvedValue(null);

      await expect(service.getProfile(999)).rejects.toThrow(NotFoundException);
    });

    it('should return profile without password when user exists', async () => {
      const mockUser = {
        id: 1,
        name: 'John Doe',
        email: 'test@example.com',
        password: 'hashed-password',
        streakCount: 3,
        lastPracticeDate: new Date(),
      };

      userRepo.findOneBy.mockResolvedValue(mockUser);

      const result = await service.getProfile(1);

      expect(result.id).toBe(1);
      expect(result.email).toBe('test@example.com');
      expect(result).not.toHaveProperty('password');
    });
  });
});
