import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CorretorService } from '../corretor/corretor.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { TimeoutService } from '../timeout/timeout.service';
import { Lead, Corretor, Interacao } from '@prisma/client';

@Injectable()
export class LeadService {
  private readonly logger = new Logger(LeadService.name);

  constructor(
    private prisma: PrismaService,
    private corretorService: CorretorService,
    private whatsappService: WhatsAppService,
    private timeoutService: TimeoutService
  ) {}

  async findAll(): Promise<Lead[]> {
    return this.prisma.lead.findMany({
      include: {
        corretor: true,
        interacoes: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findById(id: string): Promise<Lead | null> {
    return this.prisma.lead.findUnique({
      where: { id },
      include: {
        corretor: true,
        interacoes: true
      }
    });
  }

  async processarNovoLead(leadId: string): Promise<void> {
    this.logger.log(`Processando novo lead: ${leadId}`);

    const lead = await this.findById(leadId);
    if (!lead) {
      this.logger.error(`Lead não encontrado: ${leadId}`);
      return;
    }

    if (lead.status !== 'pendente') {
      this.logger.warn(`Lead ${leadId} não está pendente: ${lead.status}`);
      return;
    }

    await this.tentarAtribuirLead(lead);
  }

  private async tentarAtribuirLead(lead: Lead): Promise<void> {
    this.logger.log(`Tentando atribuir lead ${lead.id}`);

    const corretor = await this.corretorService.getProximoNaFila();
    if (!corretor) {
      this.logger.error('Nenhum corretor disponível na fila');
      return;
    }

    await this.enviarPerguntaParaCorretor(lead, corretor);
  }

  private async enviarPerguntaParaCorretor(lead: Lead, corretor: Corretor): Promise<void> {
    this.logger.log(`Enviando pergunta para corretor: ${corretor.nome}`);

    // Criar interação
    const interacao = await this.prisma.interacao.create({
      data: {
        leadId: lead.id,
        corretorId: corretor.id,
        status: 'enviado'
      }
    });

    // Enviar mensagem perguntando disponibilidade
    const sucesso = await this.whatsappService.perguntarDisponibilidade(
      corretor.telefone,
      corretor.nome
    );

    if (!sucesso) {
      this.logger.error(`Erro ao enviar mensagem para corretor: ${corretor.nome}`);
      await this.prisma.interacao.update({
        where: { id: interacao.id },
        data: { status: 'erro' }
      });
      return;
    }

    // Configurar timeout de 5 minutos
    this.timeoutService.createTimeout(interacao.id, async () => {
      await this.handleTimeoutInteracao(interacao.id);
    });
  }

  private async handleTimeoutInteracao(interacaoId: string): Promise<void> {
    this.logger.log(`Timeout para interação: ${interacaoId}`);

    const interacao = await this.prisma.interacao.findUnique({
      where: { id: interacaoId },
      include: {
        lead: true,
        corretor: true
      }
    });

    if (!interacao) {
      this.logger.error(`Interação não encontrada: ${interacaoId}`);
      return;
    }

    if (interacao.status !== 'enviado') {
      this.logger.log(`Interação ${interacaoId} já foi processada: ${interacao.status}`);
      return;
    }

    // Marcar como timeout
    await this.prisma.interacao.update({
      where: { id: interacaoId },
      data: {
        status: 'timeout',
        timeoutEm: new Date()
      }
    });

    // Mover corretor para final da fila
    await this.corretorService.moverParaFinalDaFila(interacao.corretorId);

    // Notificar corretor sobre timeout
    await this.whatsappService.notificarLeadTimeout(interacao.corretor.telefone);

    // Tentar próximo corretor
    await this.tentarAtribuirLead(interacao.lead);
  }

  async processarRespostaCorretor(telefone: string, resposta: string): Promise<void> {
    this.logger.log(`Processando resposta do corretor: ${telefone}`);

    const corretor = await this.corretorService.findByTelefone(telefone);
    if (!corretor) {
      this.logger.error(`Corretor não encontrado: ${telefone}`);
      return;
    }

    // Buscar interação mais recente pendente
    const interacao = await this.prisma.interacao.findFirst({
      where: {
        corretorId: corretor.id,
        status: 'enviado'
      },
      include: {
        lead: true
      },
      orderBy: { enviadoEm: 'desc' }
    });

    if (!interacao) {
      this.logger.warn(`Nenhuma interação pendente para corretor: ${corretor.nome}`);
      return;
    }

    // Cancelar timeout
    this.timeoutService.clearTimeout(interacao.id);

    // Determinar resposta
    const aceitou = this.analisarResposta(resposta);

    await this.prisma.interacao.update({
      where: { id: interacao.id },
      data: {
        status: aceitou ? 'respondido_sim' : 'respondido_nao',
        respondidoEm: new Date()
      }
    });

    if (aceitou) {
      await this.atribuirLeadAoCorretor(interacao.lead, corretor);
    } else {
      // Notificar corretor que recusou o lead
      await this.whatsappService.notificarLeadRecusado(corretor.telefone);
      
      // Mover corretor para final da fila
      await this.corretorService.moverParaFinalDaFila(corretor.id);
      
      // Tentar próximo corretor
      await this.tentarAtribuirLead(interacao.lead);
    }
  }

  private analisarResposta(resposta: string): boolean {
    const respostaLower = resposta.toLowerCase();
    
    const palavrasPositivas = ['sim', 'aceito', 'ok', 'aceitar', 'quero', 'vou'];
    const palavrasNegativas = ['não', 'nao', 'recuso', 'não posso', 'nao posso', 'ocupado'];

    const temPositiva = palavrasPositivas.some(palavra => respostaLower.includes(palavra));
    const temNegativa = palavrasNegativas.some(palavra => respostaLower.includes(palavra));

    // Se tem palavra positiva e não tem negativa = aceita
    if (temPositiva && !temNegativa) {
      return true;
    }

    // Se tem palavra negativa = recusa
    if (temNegativa) {
      return false;
    }

    // Se não tem nenhuma palavra clara, considera como recusa
    return false;
  }

  private async atribuirLeadAoCorretor(lead: Lead, corretor: Corretor): Promise<void> {
    this.logger.log(`Atribuindo lead ${lead.id} ao corretor ${corretor.nome}`);

    // Atualizar lead
    await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: 'atribuido',
        corretorId: corretor.id
      }
    });

    // Enviar dados do lead para o corretor
    await this.whatsappService.enviarDadosLead(corretor.telefone, {
      nome: lead.nome,
      telefone: lead.telefone
    });

    // Mover corretor para final da fila
    await this.corretorService.moverParaFinalDaFila(corretor.id);

    this.logger.log(`Lead ${lead.id} atribuído com sucesso ao corretor ${corretor.nome}`);
  }

  async getEstatisticas() {
    const [totalLeads, leadsPendentes, leadsAtribuidos, leadsFinalizados] = await Promise.all([
      this.prisma.lead.count(),
      this.prisma.lead.count({ where: { status: 'pendente' } }),
      this.prisma.lead.count({ where: { status: 'atribuido' } }),
      this.prisma.lead.count({ where: { status: 'finalizado' } })
    ]);

    const interacoesPorStatus = await this.prisma.interacao.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });

    return {
      leads: {
        total: totalLeads,
        pendentes: leadsPendentes,
        atribuidos: leadsAtribuidos,
        finalizados: leadsFinalizados
      },
      interacoes: interacoesPorStatus.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {})
    };
  }
}