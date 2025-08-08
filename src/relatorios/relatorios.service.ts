import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RelatoriosService {
  constructor(private prisma: PrismaService) {}

  async getDashboard() {
    const [
      totalLeads,
      totalCorretores,
      corretoresAtivos,
      leadsHoje,
      leadsPendentes,
      leadsAtribuidos,
      interacoesPendentes,
    ] = await Promise.all([
      this.prisma.lead.count(),
      this.prisma.corretor.count(),
      this.prisma.corretor.count({ where: { ativo: true } }),
      this.prisma.lead.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      this.prisma.lead.count({ where: { status: 'pendente' } }),
      this.prisma.lead.count({ where: { status: 'atribuido' } }),
      this.prisma.interacao.count({ where: { status: 'enviado' } }),
    ]);

    const taxaAtribuicao = totalLeads > 0 ? (leadsAtribuidos / totalLeads) * 100 : 0;

    return {
      totalLeads,
      totalCorretores,
      corretoresAtivos,
      leadsHoje,
      leadsPendentes,
      leadsAtribuidos,
      interacoesPendentes,
      taxaAtribuicao: Math.round(taxaAtribuicao * 100) / 100,
    };
  }

  async getPerformanceCorretores() {
    const corretores = await this.prisma.corretor.findMany({
      include: {
        leads: {
          select: {
            status: true,
            createdAt: true,
          },
        },
        interacoes: {
          select: {
            status: true,
            enviadoEm: true,
            respondidoEm: true,
            timeoutEm: true,
          },
        },
      },
    });

    return corretores.map((corretor) => {
      const leadsTotal = corretor.leads.length;
      const leadsAtribuidos = corretor.leads.filter(
        (lead) => lead.status === 'atribuido',
      ).length;
      const interacoesEnviadas = corretor.interacoes.filter(
        (int) => int.status === 'enviado',
      ).length;
      const interacoesRespondidas = corretor.interacoes.filter(
        (int) => int.status === 'aceito',
      ).length;
      const interacoesRecusadas = corretor.interacoes.filter(
        (int) => int.status === 'recusado',
      ).length;
      const timeouts = corretor.interacoes.filter(
        (int) => int.status === 'timeout',
      ).length;

      const taxaResposta = interacoesEnviadas > 0 
        ? ((interacoesRespondidas + interacoesRecusadas) / interacoesEnviadas) * 100 
        : 0;
      
      const taxaAceitacao = interacoesEnviadas > 0 
        ? (interacoesRespondidas / interacoesEnviadas) * 100 
        : 0;

      return {
        id: corretor.id,
        nome: corretor.nome,
        ativo: corretor.ativo,
        posicaoFila: corretor.posicaoFila,
        metricas: {
          leadsTotal,
          leadsAtribuidos,
          interacoesEnviadas,
          interacoesRespondidas,
          interacoesRecusadas,
          timeouts,
          taxaResposta: Math.round(taxaResposta * 100) / 100,
          taxaAceitacao: Math.round(taxaAceitacao * 100) / 100,
        },
      };
    });
  }

  async getLeadsPorPeriodo(inicio: string, fim: string) {
    const dataInicio = new Date(inicio);
    const dataFim = new Date(fim);
    dataFim.setHours(23, 59, 59, 999);

    const [leads, totalPeriodo, leadsPorDia] = await Promise.all([
      this.prisma.lead.findMany({
        where: {
          createdAt: {
            gte: dataInicio,
            lte: dataFim,
          },
        },
        include: {
          corretor: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.lead.count({
        where: {
          createdAt: {
            gte: dataInicio,
            lte: dataFim,
          },
        },
      }),
      this.prisma.lead.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: {
            gte: dataInicio,
            lte: dataFim,
          },
        },
        _count: {
          id: true,
        },
      }),
    ]);

    const leadsPorStatus = await this.prisma.lead.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: dataInicio,
          lte: dataFim,
        },
      },
      _count: {
        status: true,
      },
    });

    return {
      periodo: {
        inicio: dataInicio.toISOString().split('T')[0],
        fim: dataFim.toISOString().split('T')[0],
      },
      totalPeriodo,
      leadsPorStatus: leadsPorStatus.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {}),
      leads,
    };
  }

  async getTaxasConversao() {
    const [totalInteracoes, interacoesPorStatus] = await Promise.all([
      this.prisma.interacao.count(),
      this.prisma.interacao.groupBy({
        by: ['status'],
        _count: {
          status: true,
        },
      }),
    ]);

    const statusCount = interacoesPorStatus.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {});

    const taxaAceitacao = totalInteracoes > 0 
      ? ((statusCount['aceito'] || 0) / totalInteracoes) * 100 
      : 0;
    
    const taxaRecusa = totalInteracoes > 0 
      ? ((statusCount['recusado'] || 0) / totalInteracoes) * 100 
      : 0;
    
    const taxaTimeout = totalInteracoes > 0 
      ? ((statusCount['timeout'] || 0) / totalInteracoes) * 100 
      : 0;

    const conversaoPorCorretor = await this.prisma.corretor.findMany({
      include: {
        interacoes: {
          select: {
            status: true,
          },
        },
      },
    });

    const corretorConversao = conversaoPorCorretor.map((corretor) => {
      const totalInteracoesCorretor = corretor.interacoes.length;
      const aceitas = corretor.interacoes.filter(
        (int) => int.status === 'aceito',
      ).length;
      
      const taxaConversao = totalInteracoesCorretor > 0 
        ? (aceitas / totalInteracoesCorretor) * 100 
        : 0;

      return {
        corretorId: corretor.id,
        nomeCorretor: corretor.nome,
        totalInteracoes: totalInteracoesCorretor,
        interacoesAceitas: aceitas,
        taxaConversao: Math.round(taxaConversao * 100) / 100,
      };
    });

    return {
      geral: {
        totalInteracoes,
        taxaAceitacao: Math.round(taxaAceitacao * 100) / 100,
        taxaRecusa: Math.round(taxaRecusa * 100) / 100,
        taxaTimeout: Math.round(taxaTimeout * 100) / 100,
        statusCount,
      },
      porCorretor: corretorConversao,
    };
  }
}