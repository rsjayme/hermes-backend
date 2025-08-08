import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InteracoesService {
  constructor(private prisma: PrismaService) {}

  async findAll(page: number = 1, limit: number = 10, status?: string) {
    const skip = (page - 1) * limit;
    
    const where = status ? { status } : {};

    const [interacoes, total] = await Promise.all([
      this.prisma.interacao.findMany({
        where,
        skip,
        take: limit,
        include: {
          lead: {
            select: {
              id: true,
              nome: true,
              telefone: true,
              status: true,
            },
          },
          corretor: {
            select: {
              id: true,
              nome: true,
              telefone: true,
            },
          },
        },
        orderBy: {
          enviadoEm: 'desc',
        },
      }),
      this.prisma.interacao.count({ where }),
    ]);

    return {
      interacoes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByLeadId(leadId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundException('Lead não encontrado');
    }

    const interacoes = await this.prisma.interacao.findMany({
      where: { leadId },
      include: {
        corretor: {
          select: {
            id: true,
            nome: true,
            telefone: true,
          },
        },
      },
      orderBy: {
        enviadoEm: 'desc',
      },
    });

    return {
      lead: {
        id: lead.id,
        nome: lead.nome,
        telefone: lead.telefone,
        status: lead.status,
      },
      interacoes,
    };
  }

  async findByCorretorId(corretorId: string, page: number = 1, limit: number = 10) {
    const corretor = await this.prisma.corretor.findUnique({
      where: { id: corretorId },
    });

    if (!corretor) {
      throw new NotFoundException('Corretor não encontrado');
    }

    const skip = (page - 1) * limit;

    const [interacoes, total] = await Promise.all([
      this.prisma.interacao.findMany({
        where: { corretorId },
        skip,
        take: limit,
        include: {
          lead: {
            select: {
              id: true,
              nome: true,
              telefone: true,
              status: true,
            },
          },
        },
        orderBy: {
          enviadoEm: 'desc',
        },
      }),
      this.prisma.interacao.count({ where: { corretorId } }),
    ]);

    return {
      corretor: {
        id: corretor.id,
        nome: corretor.nome,
        telefone: corretor.telefone,
      },
      interacoes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async marcarComoRespondida(interacaoId: string) {
    const interacao = await this.prisma.interacao.findUnique({
      where: { id: interacaoId },
      include: {
        lead: true,
        corretor: true,
      },
    });

    if (!interacao) {
      throw new NotFoundException('Interação não encontrada');
    }

    if (interacao.status !== 'enviado') {
      throw new Error(
        `Interação já foi processada com status: ${interacao.status}`,
      );
    }

    const interacaoAtualizada = await this.prisma.interacao.update({
      where: { id: interacaoId },
      data: {
        status: 'aceito',
        respondidoEm: new Date(),
      },
      include: {
        lead: {
          select: {
            id: true,
            nome: true,
            telefone: true,
            status: true,
          },
        },
        corretor: {
          select: {
            id: true,
            nome: true,
            telefone: true,
          },
        },
      },
    });

    await this.prisma.lead.update({
      where: { id: interacao.leadId },
      data: { status: 'atribuido' },
    });

    return interacaoAtualizada;
  }

  async getEstatisticas() {
    const [
      total,
      enviadas,
      aceitas,
      recusadas,
      timeouts,
      tempoMedioResposta,
    ] = await Promise.all([
      this.prisma.interacao.count(),
      this.prisma.interacao.count({ where: { status: 'enviado' } }),
      this.prisma.interacao.count({ where: { status: 'aceito' } }),
      this.prisma.interacao.count({ where: { status: 'recusado' } }),
      this.prisma.interacao.count({ where: { status: 'timeout' } }),
      this.calcularTempoMedioResposta(),
    ]);

    const taxaResposta = total > 0 ? ((aceitas + recusadas) / total) * 100 : 0;
    const taxaAceitacao = total > 0 ? (aceitas / total) * 100 : 0;
    const taxaRecusa = total > 0 ? (recusadas / total) * 100 : 0;
    const taxaTimeout = total > 0 ? (timeouts / total) * 100 : 0;

    return {
      total,
      enviadas,
      aceitas,
      recusadas,
      timeouts,
      taxas: {
        resposta: Math.round(taxaResposta * 100) / 100,
        aceitacao: Math.round(taxaAceitacao * 100) / 100,
        recusa: Math.round(taxaRecusa * 100) / 100,
        timeout: Math.round(taxaTimeout * 100) / 100,
      },
      tempoMedioResposta: Math.round(tempoMedioResposta * 100) / 100,
    };
  }

  private async calcularTempoMedioResposta(): Promise<number> {
    const interacoesRespondidas = await this.prisma.interacao.findMany({
      where: {
        respondidoEm: {
          not: null,
        },
      },
      select: {
        enviadoEm: true,
        respondidoEm: true,
      },
    });

    if (interacoesRespondidas.length === 0) {
      return 0;
    }

    const totalMinutos = interacoesRespondidas.reduce((total, interacao) => {
      if (!interacao.respondidoEm) {
        return total;
      }
      const tempoResposta =
        (interacao.respondidoEm.getTime() - interacao.enviadoEm.getTime()) /
        1000 /
        60; // em minutos
      return total + tempoResposta;
    }, 0);

    return totalMinutos / interacoesRespondidas.length;
  }
}