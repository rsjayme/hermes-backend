import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InteracoesService } from './interacoes.service';

@Controller('interacoes')
export class InteracoesController {
  constructor(private readonly interacoesService: InteracoesService) {}

  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: string,
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (isNaN(pageNum) || pageNum < 1) {
      throw new HttpException(
        'Página deve ser um número maior que 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      throw new HttpException(
        'Limit deve ser um número entre 1 e 100',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.interacoesService.findAll(pageNum, limitNum, status);
    } catch (error) {
      throw new HttpException(
        'Erro ao buscar interações',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('estatisticas')
  async getEstatisticas() {
    try {
      return await this.interacoesService.getEstatisticas();
    } catch (error) {
      throw new HttpException(
        'Erro ao buscar estatísticas das interações',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('lead/:leadId')
  async findByLeadId(@Param('leadId') leadId: string) {
    if (!leadId) {
      throw new HttpException(
        'ID do lead é obrigatório',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.interacoesService.findByLeadId(leadId);
    } catch (error) {
      if (error.message === 'Lead não encontrado') {
        throw new HttpException('Lead não encontrado', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        'Erro ao buscar interações do lead',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('corretor/:corretorId')
  async findByCorretorId(
    @Param('corretorId') corretorId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    if (!corretorId) {
      throw new HttpException(
        'ID do corretor é obrigatório',
        HttpStatus.BAD_REQUEST,
      );
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (isNaN(pageNum) || pageNum < 1) {
      throw new HttpException(
        'Página deve ser um número maior que 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      throw new HttpException(
        'Limit deve ser um número entre 1 e 100',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.interacoesService.findByCorretorId(
        corretorId,
        pageNum,
        limitNum,
      );
    } catch (error) {
      if (error.message === 'Corretor não encontrado') {
        throw new HttpException(
          'Corretor não encontrado',
          HttpStatus.NOT_FOUND,
        );
      }
      throw new HttpException(
        'Erro ao buscar interações do corretor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/marcar-respondida')
  async marcarComoRespondida(@Param('id') interacaoId: string) {
    if (!interacaoId) {
      throw new HttpException(
        'ID da interação é obrigatório',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const interacao = await this.interacoesService.marcarComoRespondida(
        interacaoId,
      );
      return {
        message: 'Interação marcada como respondida com sucesso',
        interacao,
      };
    } catch (error) {
      if (error.message === 'Interação não encontrada') {
        throw new HttpException(
          'Interação não encontrada',
          HttpStatus.NOT_FOUND,
        );
      }
      if (error.message.includes('já foi processada')) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException(
        'Erro ao marcar interação como respondida',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}