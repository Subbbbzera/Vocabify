import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  IsNotEmpty,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateWordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  text: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  translate: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  transcription?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  partOfSpeech?: string;

  @IsNumber()
  dictionaryId: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  extraForms?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  examples?: string[];

  @IsBoolean()
  @IsOptional()
  remembered?: boolean;

  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;

  @IsBoolean()
  @IsOptional()
  important?: boolean;

  @IsOptional()
  @IsDateString()
  nextReviewDate?: Date | string | null;

  @IsNumber()
  @IsOptional()
  interval?: number;
}

export class UpdateWordDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  text?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  translate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  transcription?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  partOfSpeech?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  extraForms?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  examples?: string[];

  @IsBoolean()
  @IsOptional()
  remembered?: boolean;

  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;

  @IsBoolean()
  @IsOptional()
  important?: boolean;

  @IsOptional()
  @IsDateString()
  nextReviewDate?: Date | string | null;

  @IsNumber()
  @IsOptional()
  interval?: number;
}

export class WordExampleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  example: string;
}
