import { IsNotEmpty, IsOptional, IsString, MaxLength, IsInt } from 'class-validator';

export class SendMessageDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  text: string;

  @IsOptional()
  @IsInt()
  replyToId?: number;
}

export class EditMessageDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  text: string;
}

export class ReactMessageDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(10)
  emoji: string;
}
