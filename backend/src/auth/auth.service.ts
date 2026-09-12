import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../user/entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { RegisterDto, LoginDto, UpdateProfileDto, ResetPasswordDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  private generateToken(user: User): string {
    const payload = { sub: user.id, email: user.email };
    return this.jwtService.sign(payload);
  }

  async login(dto: LoginDto) {
    const cleanEmail = (dto.email || '').trim().toLowerCase();
    const rawPassword = dto.password || '';
    const cleanPassword = rawPassword.trim();

    console.log(`[AuthService.login] Login attempt for: "${dto.email}" (normalized: "${cleanEmail}")`);

    const user = await this.userRepo
      .createQueryBuilder('user')
      .where('LOWER(TRIM(user.email)) = LOWER(:email)', { email: cleanEmail })
      .getOne();

    if (!user) {
      console.warn(`[AuthService.login] User not found for email: "${cleanEmail}"`);
      throw new UnauthorizedException('Invalid email or password');
    }

    let isMatch = await bcrypt.compare(rawPassword, user.password);
    if (!isMatch && cleanPassword !== rawPassword) {
      isMatch = await bcrypt.compare(cleanPassword, user.password);
    }

    if (!isMatch) {
      console.warn(`[AuthService.login] Password verification failed for: "${cleanEmail}" (user ID: ${user.id})`);
      throw new UnauthorizedException('Invalid email or password');
    }

    console.log(`[AuthService.login] Successfully logged in user ID: ${user.id} (${cleanEmail})`);
    await this.updateStreak(user);

    const { password: _, ...result } = user;
    const token = this.generateToken(user);
    return { user: result, token };
  }

  async register(dto: RegisterDto) {
    const cleanEmail = (dto.email || '').trim().toLowerCase();
    const cleanName = (dto.name || '').trim();

    const existingUser = await this.userRepo
      .createQueryBuilder('user')
      .where('LOWER(TRIM(user.email)) = LOWER(:email)', { email: cleanEmail })
      .getOne();

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password.trim(), 10);
    const newUser = this.userRepo.create({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
    });

    const savedUser = await this.userRepo.save(newUser);
    const { password: _, ...result } = savedUser;
    const token = this.generateToken(savedUser);
    return { user: result, token };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const cleanEmail = (dto.email || '').trim().toLowerCase();
    const user = await this.userRepo
      .createQueryBuilder('user')
      .where('LOWER(TRIM(user.email)) = LOWER(:email)', { email: cleanEmail })
      .getOne();

    if (!user) {
      throw new NotFoundException('User with this email not found');
    }

    user.password = await bcrypt.hash(dto.newPassword.trim(), 10);
    await this.userRepo.save(user);

    console.log(`[AuthService.resetPassword] Password reset successfully for user ID: ${user.id} (${cleanEmail})`);
    const { password: _, ...result } = user;
    const token = this.generateToken(user);
    return { user: result, token, message: 'Password updated successfully' };
  }

  async getProfile(userId: number) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.lastPracticeDate && user.streakCount > 0) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const last = new Date(user.lastPracticeDate);
      const lastDate = new Date(last.getFullYear(), last.getMonth(), last.getDate());

      const diffTime = today.getTime() - lastDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 1) {
        user.streakCount = 0;
        await this.userRepo.save(user);
      }
    }

    const { password: _, ...result } = user;
    return result;
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.name) {
      user.name = dto.name;
    }
    if (dto.password) {
      user.password = await bcrypt.hash(dto.password, 10);
    }
    if (dto.avatarUrl !== undefined) {
      user.avatarUrl = dto.avatarUrl;
    }

    await this.userRepo.save(user);
    const { password: _, ...result } = user;
    return result;
  }

  async recordPractice(userId: number) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.updateStreak(user);
    const { password: _, ...result } = user;
    return result;
  }

  private async updateStreak(user: User) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (user.lastPracticeDate) {
      const last = new Date(user.lastPracticeDate);
      const lastDate = new Date(last.getFullYear(), last.getMonth(), last.getDate());

      const diffTime = today.getTime() - lastDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        user.streakCount += 1;
      } else if (diffDays > 1) {
        user.streakCount = 1;
      }
    } else {
      user.streakCount = 1;
    }

    user.lastPracticeDate = now;
    await this.userRepo.save(user);
  }
}
