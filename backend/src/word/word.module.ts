import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Word } from './entities/word.entity';
import { WordController } from './word.controller';
import { WordService } from './word.service';
import { DictionaryModule } from 'src/dictionary/dictionary.module';
import { Dictionary } from 'src/dictionary/entities/dictionary.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Word]), DictionaryModule],
  controllers: [WordController],
  providers: [WordService],
})
export class WordModule {}
