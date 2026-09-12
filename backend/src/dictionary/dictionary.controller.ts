import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { DictionaryService } from './dictionary.service';
import { DictionaryDto, ImportDictionaryDto } from './dto/dictionary.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('dictionaries')
export class DictionaryController {
  constructor(private readonly dictionaryService: DictionaryService) {}

  @Get()
  getDictionaries(@CurrentUser('id') userId: number) {
    return this.dictionaryService.getDictionaries(userId);
  }

  @Get('stats')
  getStats(@CurrentUser('id') userId: number) {
    return this.dictionaryService.getStats(userId);
  }

  @Post()
  createDictionary(
    @Body() dto: DictionaryDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.dictionaryService.createDictionary(dto, userId);
  }

  @Post('import')
  importDictionary(
    @Body() data: ImportDictionaryDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.dictionaryService.importDictionary(data, userId);
  }

  @Get(':id')
  getDictionaryById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.dictionaryService.getDictionaryById(id, userId);
  }

  @Patch(':id')
  updateDictionary(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<DictionaryDto>,
    @CurrentUser('id') userId: number,
  ) {
    return this.dictionaryService.updateDictionary(id, dto, userId);
  }

  @Delete(':id')
  deleteDictionary(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.dictionaryService.deleteDictionary(id, userId);
  }

  @Post(':id/copy')
  copyDictionary(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.dictionaryService.copyDictionary(id, userId);
  }

  @Get(':id/words')
  getWordsByDictionary(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.dictionaryService.getWordsGrouped(id, userId);
  }
}
