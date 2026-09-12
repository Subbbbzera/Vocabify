import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class DictionaryDto {
  @IsString()
  dictionaryName: string;

  @IsString()
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
  editOpacity?: number;

  @IsOptional()
  @IsNumber()
  pinOpacity?: number;
}

export class ImportDictionaryDto {
  @IsString()
  dictionaryName: string;

  @IsString()
  language: string;

  @IsOptional()
  words?: any[];

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
  editOpacity?: number;

  @IsOptional()
  pinOpacity?: number;
}
