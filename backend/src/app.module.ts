import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DictionaryModule } from './dictionary/dictionary.module';
import { Dictionary } from './dictionary/entities/dictionary.entity';
import { WordModule } from './word/word.module';
import { Word } from './word/entities/word.entity';
import { User } from './user/entities/user.entity';
import { AuthModule } from './auth/auth.module';
import { FriendModule } from './friend/friend.module';
import { Friendship } from './friend/entities/friendship.entity';
import { DirectMessage } from './friend/entities/message.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USERNAME', 'postgres'),
        password: config.get<string>('DB_PASSWORD', 'postgres'),
        database: config.get<string>('DB_DATABASE', 'nestProject'),
        entities: [Dictionary, Word, User, Friendship, DirectMessage],
        synchronize: true,
      }),
    }),
    DictionaryModule,
    WordModule,
    AuthModule,
    FriendModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
