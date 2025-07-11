import { Controller, Get, Post, Put, Param, Body, HttpException, HttpStatus } from '@nestjs/common';
import { LeadService } from './lead.service';

@Controller('leads')
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Get()
  async findAll() {
    return this.leadService.findAll();
  }

  @Get('estatisticas')
  async getEstatisticas() {
    return this.leadService.getEstatisticas();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const lead = await this.leadService.findById(id);
    if (!lead) {
      throw new HttpException('Lead não encontrado', HttpStatus.NOT_FOUND);
    }
    return lead;
  }

  @Post(':id/processar')
  async processarLead(@Param('id') id: string) {
    try {
      await this.leadService.processarNovoLead(id);
      return { message: 'Lead processado com sucesso' };
    } catch (error) {
      throw new HttpException('Erro ao processar lead', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('processar-resposta')
  async processarResposta(@Body() data: { telefone: string; resposta: string }) {
    if (!data.telefone || !data.resposta) {
      throw new HttpException('Telefone e resposta são obrigatórios', HttpStatus.BAD_REQUEST);
    }

    try {
      await this.leadService.processarRespostaCorretor(data.telefone, data.resposta);
      return { message: 'Resposta processada com sucesso' };
    } catch (error) {
      throw new HttpException('Erro ao processar resposta', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}