import { IsBoolean, IsNumber, IsOptional, IsString, IsArray } from 'class-validator';

export class CreateWordDto {
  @IsString()
  text: string;

  @IsString()
  translate: string;

  @IsNumber()
  dictionaryId: number;

  @IsString({ each: true })
  @IsOptional()
  extraForms?: string[];

  @IsArray()
  @IsOptional()
  examples?: any[];

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
  nextReviewDate?: Date | null;

  @IsNumber()
  @IsOptional()
  interval?: number;
}

export class UpdateWordDto {
  @IsString()
  @IsOptional()
  text?: string;

  @IsString()
  @IsOptional()
  translate?: string;

  @IsString({ each: true })
  @IsOptional()
  extraForms?: string[];

  @IsArray()
  @IsOptional()
  examples?: any[];

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
  nextReviewDate?: Date | null;

  @IsNumber()
  @IsOptional()
  interval?: number;
}
