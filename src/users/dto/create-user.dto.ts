import { IsEmail, IsNotEmpty, IsEnum, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  nome: string;

  @IsEmail({}, { message: 'Email deve ter um formato válido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @MinLength(6, { message: 'Senha deve ter pelo menos 6 caracteres' })
  senha: string;

  @IsEnum(['ADMIN', 'CLIENT'], { message: 'Cargo deve ser ADMIN ou CLIENT' })
  @IsNotEmpty({ message: 'Cargo é obrigatório' })
  cargo: 'ADMIN' | 'CLIENT';
}