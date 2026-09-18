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

  @Get('external-info/:text')
  async getExternalInfo(@Param('text') text: string) {
    const word = encodeURIComponent(text.trim());
    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (e) {
      // Ignore and fallback
    }

    // Fallback to Datamuse API
    try {
      const dmResponse = await fetch(`https://api.datamuse.com/words?sp=${word}&md=pr&max=1`);
      if (dmResponse.ok) {
        const dmData = await dmResponse.json();
        if (dmData && dmData.length > 0) {
          const item = dmData[0];
          const tags = item.tags || [];
          
          let partOfSpeech = '';
          if (tags.includes('n')) partOfSpeech = 'noun';
          else if (tags.includes('v')) partOfSpeech = 'verb';
          else if (tags.includes('adj')) partOfSpeech = 'adjective';
          else if (tags.includes('adv')) partOfSpeech = 'adverb';
          
          let phonetic = '';
          const pronTag = tags.find((t: string) => t.startsWith('pron:'));
          if (pronTag) {
            const arpabet = pronTag.replace('pron:', '').trim();
            const arpabetMap: Record<string, string> = {
              'AA': 'ɑ', 'AE': 'æ', 'AH': 'ʌ', 'AO': 'ɔ', 'AW': 'aʊ', 'AY': 'aɪ',
              'B': 'b', 'CH': 'tʃ', 'D': 'd', 'DH': 'ð', 'EH': 'ɛ', 'ER': 'ɝ',
              'EY': 'eɪ', 'F': 'f', 'G': 'ɡ', 'HH': 'h', 'IH': 'ɪ', 'IY': 'i',
              'JH': 'dʒ', 'K': 'k', 'L': 'l', 'M': 'm', 'N': 'n', 'NG': 'ŋ',
              'OW': 'oʊ', 'OY': 'ɔɪ', 'P': 'p', 'R': 'ɹ', 'S': 's', 'SH': 'ʃ',
              'T': 't', 'TH': 'θ', 'UH': 'ʊ', 'UW': 'u', 'V': 'v', 'W': 'w',
              'Y': 'j', 'Z': 'z', 'ZH': 'ʒ'
            };
            phonetic = '/' + arpabet.split(' ').map((s: string) => {
              const base = s.replace(/[0-9]/g, '');
              const stress = s.replace(/[^0-9]/g, '');
              let p = arpabetMap[base] || base.toLowerCase();
              if (stress === '1') p = 'ˈ' + p;
              if (stress === '2') p = 'ˌ' + p;
              return p;
            }).join('') + '/';
          }
          
          return [{
            phonetic,
            meanings: partOfSpeech ? [{ partOfSpeech }] : []
          }];
        }
      }
    } catch (e) {
      // Ignore
    }
    
    return [];
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
    @Body('example') example: any,
    @CurrentUser('id') userId: number,
    @Headers('user-id') headerId?: string,
  ) {
    const uid = userId || Number(headerId) || 1;
    return this.wordService.addExample(id, example, uid);
  }

  @Patch([':id/examples/:index', 'updateExample/:id/:index'])
  updateExample(
    @Param('id', ParseIntPipe) id: number,
    @Param('index', ParseIntPipe) index: number,
    @Body('example') example: any,
    @CurrentUser('id') userId: number,
    @Headers('user-id') headerId?: string,
  ) {
    const uid = userId || Number(headerId) || 1;
    return this.wordService.updateExample(id, index, example, uid);
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
