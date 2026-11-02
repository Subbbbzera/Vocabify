import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DuelService } from './duel.service';
import { DuelGateway } from './duel.gateway';
import { User } from '../user/entities/user.entity';
import { DuelResult } from './entities/duel-result.entity';
import { Dictionary } from '../dictionary/entities/dictionary.entity';
import { Word } from '../word/entities/word.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, DuelResult, Dictionary, Word]),
    AuthModule,
  ],
  providers: [DuelService, DuelGateway],
})
export class DuelModule {}
