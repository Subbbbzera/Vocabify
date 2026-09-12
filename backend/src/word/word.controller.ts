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
  Headers,
} from '@nestjs/common';
import { CreateWordDto, UpdateWordDto } from './dto/word.dto';
import { WordService } from './word.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller(['word', 'words'])
export class WordController {
  constructor(private readonly wordService: WordService) {}

  @Post(['', 'save'])
  saveWord(
    @Body() dto: CreateWordDto,
    @CurrentUser('id') userId: number,
    @Headers('user-id') headerId?: string,
  ) {
    const uid = userId || Number(headerId) || 1;
    return this.wordService.saveWord(dto, uid);
  }

  @Get('getWord/:id')
  getWordByDict(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Headers('user-id') headerId?: string,
  ) {
    const uid = userId || Number(headerId) || 1;
    return this.wordService.getWord(id, uid);
  }

  @Get(['details/:id', ':id'])
  getWordById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Headers('user-id') headerId?: string,
  ) {
    const uid = userId || Number(headerId) || 1;
    return this.wordService.getWordById(id, uid);
  }

  @Patch([':id', 'update/:id'])
  updateWord(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWordDto,
    @CurrentUser('id') userId: number,
    @Headers('user-id') headerId?: string,
  ) {
    const uid = userId || Number(headerId) || 1;
    return this.wordService.updateWord(id, dto, uid);
  }

  @Post('update/:id')
  updateWordPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWordDto,
    @CurrentUser('id') userId: number,
    @Headers('user-id') headerId?: string,
  ) {
    const uid = userId || Number(headerId) || 1;
    return this.wordService.updateWord(id, dto, uid);
  }

  @Delete([':id', 'delete/:id'])
  deleteWord(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Headers('user-id') headerId?: string,
  ) {
    const uid = userId || Number(headerId) || 1;
    return this.wordService.deleteWord(id, uid);
  }

  @Post('delete/:id')
  deleteWordPost(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Headers('user-id') headerId?: string,
  ) {
    const uid = userId || Number(headerId) || 1;
    return this.wordService.deleteWord(id, uid);
  }

  @Post([':id/examples', 'addExample/:id'])
  addExample(
    @Param('id', ParseIntPipe) id: number,
    @Body('example') example: string,
    @CurrentUser('id') userId: number,
    @Headers('user-id') headerId?: string,
  ) {
    const uid = userId || Number(headerId) || 1;
    return this.wordService.addExample(id, example, uid);
  }

  @Delete([':id/examples/:index', 'deleteExample/:id/:index'])
  deleteExample(
    @Param('id', ParseIntPipe) id: number,
    @Param('index', ParseIntPipe) index: number,
    @CurrentUser('id') userId: number,
    @Headers('user-id') headerId?: string,
  ) {
    const uid = userId || Number(headerId) || 1;
    return this.wordService.deleteExample(id, index, uid);
  }
}
