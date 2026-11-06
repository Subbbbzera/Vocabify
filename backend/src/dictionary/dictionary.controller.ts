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
  Res,
} from '@nestjs/common';

import { DictionaryService } from './dictionary.service';
import {
  DictionaryDto,
  DictionaryIdDto,
  ImportDictionaryDto,
  RateDictionaryDto,
  UpdateDictionaryByBodyDto,
  UpdateDictionaryDto,
} from './dto/dictionary.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller(['dictionary', 'dictionaries'])
export class DictionaryController {
  constructor(private readonly dictionaryService: DictionaryService) {}

  @Get(['', 'Getdictionary'])
  getDictionaries(@CurrentUser('id') userId: number) {
    return this.dictionaryService.getDictionaries(userId);
  }

  @Get('suggested')
  getSuggestedDictionaries(@CurrentUser('id') userId: number) {
    return this.dictionaryService.getSuggestedDictionaries(userId);
  }

  @Get('stats')
  getStats(@CurrentUser('id') userId: number) {
    return this.dictionaryService.getStats(userId);
  }

  @Post(['', 'create'])
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

  @Get(['InnerD/:id', ':id'])
  getDictionaryById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.dictionaryService.getDictionaryById(id, userId);
  }

  @Post('update')
  updateByPost(
    @Body() body: UpdateDictionaryByBodyDto,
    @CurrentUser('id') userId: number,
  ) {
    const { id, ...dto } = body;
    return this.dictionaryService.updateDictionary(id, dto, userId);
  }

  @Patch([':id', 'update/:id'])
  updateDictionary(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDictionaryDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.dictionaryService.updateDictionary(id, dto, userId);
  }

  @Post('delete')
  deleteByPost(
    @Body() body: DictionaryIdDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.dictionaryService.deleteDictionary(body.id, userId);
  }

  @Delete([':id', 'delete/:id'])
  deleteDictionary(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.dictionaryService.deleteDictionary(id, userId);
  }

  @Post('copy')
  copyByPost(
    @Body() body: DictionaryIdDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.dictionaryService.copyDictionary(body.id, userId);
  }

  @Post([':id/copy', 'copy/:id'])
  copyDictionary(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.dictionaryService.copyDictionary(id, userId);
  }

  @Get([':id/words', 'words/:id'])
  getWordsByDictionary(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.dictionaryService.getWordsGrouped(id, userId);
  }

  @Get(':id/export')
  async exportDictionary(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: any,
    @CurrentUser('id') userId: number,
  ) {
    const dictionary: any = await this.dictionaryService.getDictionaryById(id, userId);
    const wordsObj: any = await this.dictionaryService.getWordsGrouped(id, userId);

    const words = Object.values(wordsObj).flat().map((w: any) => {
      const { id, dictionaryId, createdAt, updatedAt, ...wordData } = w;
      return wordData;
    });

    const { dictionaryId, user, amountWord, rememberedWords, views, viewers, averageRating, totalRatings, ratingsMap, isPublic, ...dictData } = dictionary;

    const exportData = {
      ...dictData,
      words,
    };

    const safeName = encodeURIComponent(dictionary.dictionaryName || String(id));
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="dictionary-${safeName}.json"`);
    res.send(JSON.stringify(exportData, null, 2));
  }

  @Post(':id/view')
  incrementViews(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.dictionaryService.incrementViews(id, userId);
  }

  @Post(':id/rate')
  rateDictionary(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RateDictionaryDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.dictionaryService.rateDictionary(id, body.stars, userId);
  }
}
