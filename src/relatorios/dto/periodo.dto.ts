import { IsDateString, IsNotEmpty } from 'class-validator';

export class PeriodoDto {
  @IsNotEmpty({ message: 'Data de início é obrigatória' })
  @IsDateString({}, { message: 'Data de início deve estar no formato YYYY-MM-DD' })
  inicio: string;

  @IsNotEmpty({ message: 'Data de fim é obrigatória' })
  @IsDateString({}, { message: 'Data de fim deve estar no formato YYYY-MM-DD' })
  fim: string;
}