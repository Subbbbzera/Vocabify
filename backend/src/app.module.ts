import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { DictionaryModule } from './dictionary/dictionary.module';
import { Dictionary } from './dictionary/entities/dictionary.entity';
import { WordModule } from './word/word.module';
import { Word } from './word/entities/word.entity';
import { User } from './user/entities/user.entity';
import { AuthModule } from './auth/auth.module';
import { FriendModule } from './friend/friend.module';
import { Friendship } from './friend/entities/friendship.entity';
import { DirectMessage } from './friend/entities/message.entity';
import { DuelModule } from './duel/duel.module';
import { DuelResult } from './duel/entities/duel-result.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbUrl = config.get<string>('DATABASE_URL');
        const dbSsl = config.get<string>('DB_SSL');
        const isSsl = dbSsl === 'true' || (dbSsl !== 'false' && (!!dbUrl && !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1')));

        return {
          type: 'postgres' as const,
          ...(dbUrl
            ? { url: dbUrl }
            : {
                host: config.get<string>('DB_HOST', 'localhost'),
                port: config.get<number>('DB_PORT', 5432),
                username: config.get<string>('DB_USERNAME', 'postgres'),
                password: config.get<string>('DB_PASSWORD', 'postgres'),
                database: config.get<string>('DB_DATABASE', 'nestProject'),
              }),
          ssl: isSsl ? { rejectUnauthorized: false } : false,
          entities: [Dictionary, Word, User, Friendship, DirectMessage, DuelResult],
          synchronize: config.get<string>('NODE_ENV') !== 'production',
        };
      },
    }),
    DictionaryModule,
    WordModule,
    AuthModule,
    FriendModule,
    DuelModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
