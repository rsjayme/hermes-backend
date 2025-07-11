import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeadService } from '../lead/lead.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private prisma: PrismaService,
    private leadService: LeadService
  ) {}

  async processMessage(payload: any) {
    this.logger.log('Processando mensagem do webhook...');
    
    // Verificar estrutura básica do payload
    if (!payload?.data) {
      this.logger.warn('Payload inválido - sem data');
      return;
    }

    const data = payload.data;
    
    // Verificar se não é uma mensagem enviada por nós
    if (data.key?.fromMe) {
      this.logger.log('Mensagem enviada por nós - ignorando');
      return;
    }

    // Extrair telefone do remoteJid
    if (!data.key?.remoteJid) {
      this.logger.warn('Payload inválido - sem remoteJid');
      return;
    }

    const telefoneRaw = data.key.remoteJid.replace('@s.whatsapp.net', '');
    const telefone = this.normalizarTelefone(telefoneRaw);
    
    // Extrair texto da mensagem (suporta diferentes tipos)
    const mensagemTexto = this.extractMessageText(data);
    
    this.logger.log(`Mensagem recebida de: ${telefoneRaw} (normalizado: ${telefone})`);
    this.logger.log(`Tipo: ${data.messageType || 'unknown'}`);
    this.logger.log(`Conteúdo: ${mensagemTexto}`);

    // Verificar se é corretor (para resposta ou qualquer mensagem)
    const isCorretor = await this.isCorretor(telefone);
    
    if (isCorretor) {
      // Se é corretor, verificar se tem interação pendente
      if (await this.hasInteracaoPendente(telefone)) {
        await this.leadService.processarRespostaCorretor(telefone, mensagemTexto);
      } else {
        this.logger.log(`Mensagem de corretor ${telefone} ignorada - sem interação pendente`);
      }
      return;
    }

    // Se não é corretor, processar como novo lead
    const lead = await this.handleNewLead(telefone, mensagemTexto, data);
    if (lead) {
      await this.leadService.processarNovoLead(lead.id);
    }
  }

  private extractMessageText(data: any): string {
    // Texto simples
    if (data.message?.conversation) {
      return data.message.conversation;
    }
    
    // Mensagem de texto extendida
    if (data.message?.extendedTextMessage?.text) {
      return data.message.extendedTextMessage.text;
    }
    
    // Para outros tipos (áudio, imagem, etc.), retornar indicação do tipo
    if (data.messageType) {
      switch (data.messageType) {
        case 'audioMessage':
          return '[Áudio]';
        case 'imageMessage':
          return '[Imagem]';
        case 'videoMessage':
          return '[Vídeo]';
        case 'documentMessage':
          return '[Documento]';
        case 'stickerMessage':
          return '[Sticker]';
        default:
          return `[${data.messageType}]`;
      }
    }
    
    return '[Mensagem]';
  }

  private normalizarTelefone(telefone: string): string {
    // Remove caracteres não numéricos
    const numeroLimpo = telefone.replace(/\D/g, '');
    
    // Se tem 13 dígitos (55 + DDD + 9 + 8 dígitos), manter como está
    if (numeroLimpo.length === 13) {
      return numeroLimpo;
    }
    
    // Se tem 12 dígitos (55 + DDD + 8 dígitos), adicionar o 9
    if (numeroLimpo.length === 12) {
      // Extrair código do país (55) + DDD (2 dígitos) + número (8 dígitos)
      const codigoPais = numeroLimpo.substring(0, 2); // 55
      const ddd = numeroLimpo.substring(2, 4); // 62
      const numero = numeroLimpo.substring(4); // 81804477
      
      // Adicionar o 9 antes do número
      return `${codigoPais}${ddd}9${numero}`;
    }
    
    // Se tem 11 dígitos (DDD + 9 + 8 dígitos), adicionar 55
    if (numeroLimpo.length === 11) {
      return `55${numeroLimpo}`;
    }
    
    // Se tem 10 dígitos (DDD + 8 dígitos), adicionar 55 + 9
    if (numeroLimpo.length === 10) {
      const ddd = numeroLimpo.substring(0, 2);
      const numero = numeroLimpo.substring(2);
      return `55${ddd}9${numero}`;
    }
    
    // Retornar como está se não se encaixa nos padrões
    return numeroLimpo;
  }

  private async isCorretor(telefone: string): Promise<boolean> {
    // Buscar por telefone normalizado e também pela versão sem o 9
    const telefoneNormalizado = this.normalizarTelefone(telefone);
    const telefoneSem9 = this.removerNove(telefoneNormalizado);
    
    const corretor = await this.prisma.corretor.findFirst({
      where: {
        OR: [
          { telefone: telefoneNormalizado },
          { telefone: telefoneSem9 }
        ]
      }
    });

    return !!corretor;
  }

  private removerNove(telefone: string): string {
    // Remove o 9 se estiver na posição correta (após DDD)
    if (telefone.length === 13 && telefone.substring(4, 5) === '9') {
      const codigoPais = telefone.substring(0, 2);
      const ddd = telefone.substring(2, 4);
      const numero = telefone.substring(5);
      return `${codigoPais}${ddd}${numero}`;
    }
    return telefone;
  }

  private async hasInteracaoPendente(telefone: string): Promise<boolean> {
    // Buscar corretor usando normalização de telefone
    const telefoneNormalizado = this.normalizarTelefone(telefone);
    const telefoneSem9 = this.removerNove(telefoneNormalizado);
    
    const corretor = await this.prisma.corretor.findFirst({
      where: {
        OR: [
          { telefone: telefoneNormalizado },
          { telefone: telefoneSem9 }
        ]
      }
    });

    if (!corretor) {
      return false;
    }

    const interacaoPendente = await this.prisma.interacao.findFirst({
      where: {
        corretorId: corretor.id,
        status: 'enviado'
      },
      orderBy: { enviadoEm: 'desc' }
    });

    return !!interacaoPendente;
  }


  private async handleNewLead(telefone: string, mensagem: string, data: any) {
    this.logger.log(`Processando novo lead: ${telefone}`);
    
    // IMPORTANTE: Verificar novamente se não é corretor (dupla validação)
    if (await this.isCorretor(telefone)) {
      this.logger.warn(`BLOQUEADO: Tentativa de criar lead com telefone de corretor: ${telefone}`);
      return null;
    }

    // Extrair nome do pushName ou da mensagem
    const nome = this.extractLeadName(data, mensagem);
    
    // Criar ou atualizar lead
    const lead = await this.prisma.lead.upsert({
      where: { telefone },
      update: {
        status: 'pendente',
        updatedAt: new Date(),
        // Atualizar nome se disponível
        ...(nome && { nome })
      },
      create: {
        telefone,
        nome,
        status: 'pendente'
      }
    });

    this.logger.log(`Lead criado/atualizado: ${lead.id} - Nome: ${nome || 'Não informado'}`);
    return lead;
  }

  private extractLeadName(data: any, mensagem: string): string | null {
    // 1. Primeiro, tentar extrair do pushName (prioridade)
    if (data.pushName && data.pushName.trim()) {
      return data.pushName.trim();
    }

    // 2. Caso não tenha pushName, tentar extrair da mensagem
    return this.extractNameFromMessage(mensagem);
  }

  private extractNameFromMessage(mensagem: string): string | null {
    // Lógica simples para extrair nome da mensagem
    // Pode ser aprimorada conforme necessário
    const linhas = mensagem.split('\n');
    for (const linha of linhas) {
      if (linha.toLowerCase().includes('nome:')) {
        return linha.split(':')[1]?.trim() || null;
      }
    }
    return null;
  }
}