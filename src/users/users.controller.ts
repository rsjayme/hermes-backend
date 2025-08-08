import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  UseGuards,
  Request,
  ValidationPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('ADMIN')
  async create(@Body(ValidationPipe) createUserDto: CreateUserDto, @Request() req) {
    try {
      return await this.usersService.create(createUserDto, req.user.cargo);
    } catch (error) {
      if (error.code === 'P2002') {
        throw new HttpException('Email já está sendo utilizado', HttpStatus.CONFLICT);
      }
      throw new HttpException(
        error.message || 'Erro ao criar usuário',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @Roles('ADMIN')
  async findAll() {
    try {
      return await this.usersService.findAll();
    } catch (error) {
      throw new HttpException(
        'Erro ao buscar usuários',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    if (req.user.cargo !== 'ADMIN' && req.user.userId !== id) {
      throw new HttpException(
        'Você só pode visualizar seu próprio perfil',
        HttpStatus.FORBIDDEN,
      );
    }

    try {
      return await this.usersService.findOne(id);
    } catch (error) {
      if (error.message === 'Usuário não encontrado') {
        throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        'Erro ao buscar usuário',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateUserDto: UpdateUserDto,
    @Request() req,
  ) {
    try {
      return await this.usersService.update(
        id,
        updateUserDto,
        req.user.cargo,
        req.user.userId,
      );
    } catch (error) {
      if (error.code === 'P2002') {
        throw new HttpException('Email já está sendo utilizado', HttpStatus.CONFLICT);
      }
      if (error.message === 'Usuário não encontrado') {
        throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        error.message || 'Erro ao atualizar usuário',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id/toggle-active')
  @Roles('ADMIN')
  async toggleActive(@Param('id') id: string, @Request() req) {
    try {
      return await this.usersService.toggleActive(id, req.user.cargo);
    } catch (error) {
      if (error.message === 'Usuário não encontrado') {
        throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        error.message || 'Erro ao alterar status do usuário',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}