import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto, currentUserCargo: string) {
    if (currentUserCargo !== 'ADMIN') {
      throw new ForbiddenException('Apenas administradores podem criar usuários');
    }

    const existingUser = await this.prisma.usuario.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email já está sendo utilizado');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.senha, 10);

    const user = await this.prisma.usuario.create({
      data: {
        ...createUserDto,
        senha: hashedPassword,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        cargo: true,
        ativo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async findAll() {
    return this.prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        cargo: true,
        ativo: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        cargo: true,
        ativo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUserCargo: string, currentUserId: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (currentUserCargo !== 'ADMIN' && currentUserId !== id) {
      throw new ForbiddenException('Você só pode atualizar seu próprio perfil');
    }

    if (updateUserDto.cargo && currentUserCargo !== 'ADMIN') {
      throw new ForbiddenException('Apenas administradores podem alterar cargos');
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.prisma.usuario.findUnique({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email já está sendo utilizado');
      }
    }

    const updateData: any = { ...updateUserDto };
    
    if (updateUserDto.senha) {
      updateData.senha = await bcrypt.hash(updateUserDto.senha, 10);
    }

    const updatedUser = await this.prisma.usuario.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        nome: true,
        email: true,
        cargo: true,
        ativo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async toggleActive(id: string, currentUserCargo: string) {
    if (currentUserCargo !== 'ADMIN') {
      throw new ForbiddenException('Apenas administradores podem ativar/desativar usuários');
    }

    const user = await this.prisma.usuario.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const updatedUser = await this.prisma.usuario.update({
      where: { id },
      data: { ativo: !user.ativo },
      select: {
        id: true,
        nome: true,
        email: true,
        cargo: true,
        ativo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async createDefaultAdmin() {
    const adminExists = await this.prisma.usuario.findFirst({
      where: { cargo: 'ADMIN' },
    });

    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const admin = await this.prisma.usuario.create({
        data: {
          nome: 'Administrador',
          email: 'admin@mgv.com',
          senha: hashedPassword,
          cargo: 'ADMIN',
        },
        select: {
          id: true,
          nome: true,
          email: true,
          cargo: true,
          ativo: true,
        },
      });

      return admin;
    }

    return null;
  }
}