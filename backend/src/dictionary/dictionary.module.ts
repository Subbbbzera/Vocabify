import { Module } from '@nestjs/common';
import { DictionaryController } from './dictionary.controller';
import { DictionaryService } from './dictionary.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dictionary } from 'src/dictionary/entities/dictionary.entity';
import { Word } from 'src/word/entities/word.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Dictionary, Word])],
  controllers: [DictionaryController],
  providers: [DictionaryService],
  exports: [DictionaryService, TypeOrmModule],
})
export class DictionaryModule {}
