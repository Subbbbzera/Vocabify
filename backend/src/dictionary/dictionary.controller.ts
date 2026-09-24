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
  Headers,
  Res,
} from '@nestjs/common';

import { DictionaryService } from './dictionary.service';
import { DictionaryDto, ImportDictionaryDto } from './dto/dictionary.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller(['dictionary', 'dictionaries'])
export class DictionaryController {
  constructor(private readonly dictionaryService: DictionaryService) {}

  @Get(['', 'Getdictionary'])
  getDictionaries(
    @CurrentUser('id') userId: number,
    @Headers('user-id') headerId?: string,
  ) {
    const uid = userId || Number(headerId) || 1;
    return this.dictionaryService.getDictionaries(uid);
  }

  @Get('suggested')
  getSuggestedDictionaries(
    @CurrentUser('id') userId: number,
    @Headers('user-id') headerId?: string,
  ) {
    const uid = userId || Number(headerId) || 1;
    return this.dictionaryService.getSuggestedDictionaries(uid);
  }

  @Get('stats')
  getStats(
    @CurrentUser('id') userId: number,
    @Headers('user-id') headerId?: string,
  ) {
    const uid = userId || Number(headerId) || 1;
    return this.dictionaryService.getStats(uid);
  }

  @Post(['', 'create'])
  createDictionary(
    @Body() dto: DictionaryDto,
    @CurrentUser('id') userId: number,
    @Headers('user-id') headerId?: string,
  ) {
    const uid = userId || Number(headerId) || 1;
    return this.dictionaryService.createDictionary(dto, uid);
  }

  @Post('import')
  importDictionary(
    @Body() data: ImportDictionaryDto,
    @CurrentUser('id') userId: number,
    @Headers('user-id') headerId?: string,
  ) {
    const uid = userId || Number(headerId) || 1;
    return this.dictionaryService.importDictionary(data, uid);
  }

  @Get(['InnerD/:id', ':id'])
  getDictionaryById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Headers('user-id') headerId?: string,
  ) {
    const uid = userId || Number(headerId) || 1;
    return this.dictionaryService.getDictionaryById(id, uid);
  }

  @Post('update')
  updateByPost(
    @Body() body: any,
    @CurrentUser('id') userId: number,
    @Headers('user-id') headerId?: string,
  ) {
    const { id, ...dto } = body;
    const uid = userId || Number(headerId) || 1;
    return this.dictionaryService.updateDictionary(Number(id), dto, uid);
  }

  @Patch([':id', 'update/:id'])
  updateDictionary(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<DictionaryDto>,
    @CurrentUser('id') userId: number,
    @Headers('user-id') headerId?: string,
  ) {
    const uid = userId || Number(headerId) || 1;
    return this.dictionaryService.updateDictionary(id, dto, uid);
  }

  @Post('delete')
  deleteByPost(
    @Body() body: { id: number },
    @CurrentUser('id') userId: number,
    @Headers('user-id') headerId?: string,
  ) {
    const uid = userId || Number(headerId) || 1;
    return this.dictionaryService.deleteDictionary(Number(body.id), uid);
  }

  @Delete([':id', 'delete/:id'])
  deleteDictionary(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Headers('user-id') headerId?: string,
  ) {
    const uid = userId || Number(headerId) || 1;
    return this.dictionaryService.deleteDictionary(id, uid);
  }

  @Post('copy')
  copyByPost(
    @Body() body: { id: number },
    @CurrentUser('id') userId: number,
    @Headers('user-id') headerId?: string,
  ) {
    const uid = userId || Number(headerId) || 1;
    return this.dictionaryService.copyDictionary(Number(body.id), uid);
  }

  @Post([':id/copy', 'copy/:id'])
  copyDictionary(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Headers('user-id') headerId?: string,
  ) {
    const uid = userId || Number(headerId) || 1;
    return this.dictionaryService.copyDictionary(id, uid);
  }

  @Get([':id/words', 'words/:id'])
  getWordsByDictionary(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Headers('user-id') headerId?: string,
  ) {
    const uid = userId || Number(headerId) || 1;
    return this.dictionaryService.getWordsGrouped(id, uid);
  }

  @Get(':id/export')
  async exportDictionary(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: any,
    @CurrentUser('id') userId: number,
    @Headers('user-id') headerId?: string,
  ) {
    const uid = userId || Number(headerId) || 1;
    
    // Отримуємо словник та слова
    const dictionary: any = await this.dictionaryService.getDictionaryById(id, uid);
    const wordsObj: any = await this.dictionaryService.getWordsGrouped(id, uid);
    
    // Форматуємо слова, прибираючи непотрібні поля
    const words = Object.values(wordsObj).flat().map((w: any) => {
      const { id, dictionaryId, createdAt, updatedAt, ...wordData } = w;
      return wordData;
    });

    // Форматуємо словник
    const { dictionaryId, user, amountWord, rememberedWords, views, viewers, averageRating, totalRatings, ratingsMap, isPublic, ...dictData } = dictionary;

    const exportData = {
      ...dictData,
      words
    };

    // Відправляємо як JSON-файл
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="dictionary-${dictionary.dictionaryName || id}.json"`);
    res.send(JSON.stringify(exportData, null, 2));
  }

  @Post(':id/view')
  incrementViews(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Headers('user-id') headerId?: string,
  ) {
    const uid = userId || Number(headerId) || 1;
    return this.dictionaryService.incrementViews(id, uid);
  }

  @Post(':id/rate')
  rateDictionary(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { stars: number },
    @CurrentUser('id') userId: number,
    @Headers('user-id') headerId?: string,
  ) {
    const uid = userId || Number(headerId) || 1;
    return this.dictionaryService.rateDictionary(id, body.stars, uid);
  }
}
