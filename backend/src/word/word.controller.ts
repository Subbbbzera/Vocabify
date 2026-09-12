import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { CreateWordDto, UpdateWordDto } from './dto/word.dto';
import { WordService } from './word.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('words')
export class WordController {
  constructor(private readonly wordService: WordService) {}

  @Post()
  saveWord(
    @Body() dto: CreateWordDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.wordService.saveWord(dto, userId);
  }

  @Get(':id')
  getWordById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.wordService.getWordById(id, userId);
  }

  @Patch(':id')
  updateWord(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWordDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.wordService.updateWord(id, dto, userId);
  }

  @Delete(':id')
  deleteWord(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.wordService.deleteWord(id, userId);
  }

  @Post(':id/examples')
  addExample(
    @Param('id', ParseIntPipe) id: number,
    @Body('example') example: string,
    @CurrentUser('id') userId: number,
  ) {
    return this.wordService.addExample(id, example, userId);
  }

  @Delete(':id/examples/:index')
  deleteExample(
    @Param('id', ParseIntPipe) id: number,
    @Param('index', ParseIntPipe) index: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.wordService.deleteExample(id, index, userId);
  }
}
