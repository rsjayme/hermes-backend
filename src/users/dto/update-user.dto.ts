import { IsEmail, IsOptional, IsEnum, MinLength, IsBoolean } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  nome?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email deve ter um formato válido' })
  email?: string;

  @IsOptional()
  @MinLength(6, { message: 'Senha deve ter pelo menos 6 caracteres' })
  senha?: string;

  @IsOptional()
  @IsEnum(['ADMIN', 'CLIENT'], { message: 'Cargo deve ser ADMIN ou CLIENT' })
  cargo?: 'ADMIN' | 'CLIENT';

  @IsOptional()
  @IsBoolean({ message: 'Ativo deve ser true ou false' })
  ativo?: boolean;
}