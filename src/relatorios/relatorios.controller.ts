import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RelatoriosService } from './relatorios.service';

@Controller('relatorios')
export class RelatoriosController {
  constructor(private readonly relatoriosService: RelatoriosService) {}

  @Get('dashboard')
  async getDashboard() {
    try {
      return await this.relatoriosService.getDashboard();
    } catch (error) {
      throw new HttpException(
        'Erro ao buscar dados do dashboard',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('performance-corretores')
  async getPerformanceCorretores() {
    try {
      return await this.relatoriosService.getPerformanceCorretores();
    } catch (error) {
      throw new HttpException(
        'Erro ao buscar performance dos corretores',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('leads-periodo')
  async getLeadsPorPeriodo(
    @Query('inicio') inicio: string,
    @Query('fim') fim: string,
  ) {
    if (!inicio || !fim) {
      throw new HttpException(
        'Parâmetros inicio e fim são obrigatórios',
        HttpStatus.BAD_REQUEST,
      );
    }

    const inicioDate = new Date(inicio);
    const fimDate = new Date(fim);

    if (isNaN(inicioDate.getTime()) || isNaN(fimDate.getTime())) {
      throw new HttpException(
        'Datas inválidas. Use o formato YYYY-MM-DD',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (inicioDate > fimDate) {
      throw new HttpException(
        'Data de início deve ser anterior à data de fim',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.relatoriosService.getLeadsPorPeriodo(inicio, fim);
    } catch (error) {
      throw new HttpException(
        'Erro ao buscar leads por período',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('conversao')
  async getTaxasConversao() {
    try {
      return await this.relatoriosService.getTaxasConversao();
    } catch (error) {
      throw new HttpException(
        'Erro ao buscar taxas de conversão',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}