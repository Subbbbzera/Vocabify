import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/swagger';

export class DictionaryDto {
  @IsString()
  @IsNotEmpty()
  dictionaryName: string;

  @IsString()
  @IsNotEmpty()
  language: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsBoolean()
  showName?: boolean;

  @IsOptional()
  @IsBoolean()
  showLanguage?: boolean;

  @IsOptional()
  @IsBoolean()
  showFlag?: boolean;

  @IsOptional()
  @IsBoolean()
  showProgress?: boolean;

  @IsOptional()
  @IsBoolean()
  showImported?: boolean;

  @IsOptional()
  @IsBoolean()
  isImported?: boolean;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  editOpacity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  pinOpacity?: number;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateDictionaryDto extends PartialType(DictionaryDto) {}

export class UpdateDictionaryByBodyDto extends UpdateDictionaryDto {
  @IsInt()
  id: number;
}

export class DictionaryIdDto {
  @IsInt()
  id: number;
}

export class RateDictionaryDto {
  @IsInt()
  @Min(1)
  @Max(5)
  stars: number;
}

export class ImportedWordDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsString()
  @IsNotEmpty()
  translate: string;

  @IsOptional()
  @IsString()
  transcription?: string;

  @IsOptional()
  @IsString()
  partOfSpeech?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  extraForms?: string[];

  @IsOptional()
  @IsArray()
  examples?: string[];

  @IsOptional()
  @IsBoolean()
  remembered?: boolean;

  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;

  @IsOptional()
  @IsBoolean()
  important?: boolean;
}

export class ImportDictionaryDto {
  @IsString()
  @IsNotEmpty()
  dictionaryName: string;

  @IsString()
  @IsNotEmpty()
  language: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportedWordDto)
  words?: ImportedWordDto[];

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsBoolean()
  showName?: boolean;

  @IsOptional()
  @IsBoolean()
  showLanguage?: boolean;

  @IsOptional()
  @IsBoolean()
  showFlag?: boolean;

  @IsOptional()
  @IsBoolean()
  showProgress?: boolean;

  @IsOptional()
  @IsBoolean()
  showImported?: boolean;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  editOpacity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  pinOpacity?: number;
}
