import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Friendship } from './entities/friendship.entity';
import { DirectMessage } from './entities/message.entity';
import { User } from '../user/entities/user.entity';
import { Dictionary } from '../dictionary/entities/dictionary.entity';
import { Word } from '../word/entities/word.entity';
import { FriendService } from './friend.service';
import { FriendController } from './friend.controller';
import { ChatGateway } from './chat.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Friendship, DirectMessage, User, Dictionary, Word]),
    forwardRef(() => AuthModule),
  ],
  controllers: [FriendController],
  providers: [FriendService, ChatGateway],
  exports: [FriendService, ChatGateway],
})
export class FriendModule {}
