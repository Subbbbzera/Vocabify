import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

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
}
