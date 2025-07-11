import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { CorretorService } from './corretor.service';

@Controller('corretores')
export class CorretorController {
  constructor(private readonly corretorService: CorretorService) { }

  @Get()
  async findAll() {
    return this.corretorService.findAll();
  }

  @Get('status-fila')
  async getStatusFila() {
    return this.corretorService.getStatusFila();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const corretor = await this.corretorService.findById(id);
    if (!corretor) {
      throw new HttpException('Corretor não encontrado', HttpStatus.NOT_FOUND);
    }
    return corretor;
  }

  @Post()
  async create(@Body() data: { nome: string; telefone: string }) {
    if (!data.nome || !data.telefone) {
      throw new HttpException('Nome e telefone são obrigatórios', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.corretorService.create(data);
    } catch (error) {
      if (error.code === 'P2002') {
        throw new HttpException('Telefone já cadastrado', HttpStatus.CONFLICT);
      }
      throw new HttpException('Erro ao criar corretor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    try {
      return await this.corretorService.update(id, data);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new HttpException('Corretor não encontrado', HttpStatus.NOT_FOUND);
      }
      throw new HttpException('Erro ao atualizar corretor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id/toggle-ativo')
  async toggleAtivo(@Param('id') id: string) {
    try {
      return await this.corretorService.toggleAtivo(id);
    } catch (error) {
      throw new HttpException('Erro ao alterar status do corretor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id/mover-para-final')
  async moverParaFinal(@Param('id') id: string) {
    try {
      await this.corretorService.moverParaFinalDaFila(id);
      return { message: 'Corretor movido para o final da fila' };
    } catch (error) {
      throw new HttpException('Erro ao mover corretor na fila', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    try {
      await this.corretorService.delete(id);
      return { message: 'Corretor removido com sucesso' };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new HttpException('Corretor não encontrado', HttpStatus.NOT_FOUND);
      }
      throw new HttpException('Erro ao remover corretor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}