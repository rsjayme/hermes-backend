import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Corretor } from '@prisma/client';

@Injectable()
export class CorretorService {
  private readonly logger = new Logger(CorretorService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<Corretor[]> {
    return this.prisma.corretor.findMany({
      orderBy: { posicaoFila: 'asc' }
    });
  }

  async findById(id: string): Promise<Corretor | null> {
    return this.prisma.corretor.findUnique({
      where: { id }
    });
  }

  async findByTelefone(telefone: string): Promise<Corretor | null> {
    const telefoneNormalizado = this.normalizarTelefone(telefone);
    const telefoneSem9 = this.removerNove(telefoneNormalizado);

    return this.prisma.corretor.findFirst({
      where: {
        OR: [
          { telefone: telefoneNormalizado },
          { telefone: telefoneSem9 }
        ]
      }
    });
  }

  async create(data: { nome: string; telefone: string }): Promise<Corretor> {
    const telefoneNormalizado = this.normalizarTelefone(data.telefone);
    const telefoneSem9 = this.removerNove(telefoneNormalizado);

    // Verificar se telefone já existe como lead (ambas as versões)
    const leadExistente = await this.prisma.lead.findFirst({
      where: {
        OR: [
          { telefone: telefoneNormalizado },
          { telefone: telefoneSem9 }
        ]
      }
    });

    if (leadExistente) {
      throw new Error(`Telefone ${data.telefone} já está cadastrado como lead. Um corretor não pode ter o mesmo telefone de um lead.`);
    }

    const ultimaPosicao = await this.getUltimaPosicaoFila();
    
    return this.prisma.corretor.create({
      data: {
        nome: data.nome,
        telefone: telefoneNormalizado, // Sempre salvar normalizado
        posicaoFila: ultimaPosicao + 1
      }
    });
  }

  async update(id: string, data: Partial<Corretor>): Promise<Corretor> {
    const updateData = { ...data };

    // Se está atualizando o telefone, normalizar e verificar se não existe como lead
    if (data.telefone) {
      const telefoneNormalizado = this.normalizarTelefone(data.telefone);
      const telefoneSem9 = this.removerNove(telefoneNormalizado);

      const leadExistente = await this.prisma.lead.findFirst({
        where: {
          OR: [
            { telefone: telefoneNormalizado },
            { telefone: telefoneSem9 }
          ]
        }
      });

      if (leadExistente) {
        throw new Error(`Telefone ${data.telefone} já está cadastrado como lead. Um corretor não pode ter o mesmo telefone de um lead.`);
      }

      updateData.telefone = telefoneNormalizado; // Sempre salvar normalizado
    }

    return this.prisma.corretor.update({
      where: { id },
      data: updateData
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.corretor.delete({
      where: { id }
    });
    
    // Reordenar posições na fila
    await this.reordernarFila();
  }

  async getProximoNaFila(): Promise<Corretor | null> {
    const corretor = await this.prisma.corretor.findFirst({
      where: { ativo: true },
      orderBy: { posicaoFila: 'asc' }
    });

    if (!corretor) {
      this.logger.warn('Nenhum corretor ativo encontrado na fila');
      return null;
    }

    this.logger.log(`Próximo corretor na fila: ${corretor.nome} (posição: ${corretor.posicaoFila})`);
    return corretor;
  }

  async moverParaFinalDaFila(corretorId: string): Promise<void> {
    const corretor = await this.findById(corretorId);
    if (!corretor) {
      throw new Error('Corretor não encontrado');
    }

    const ultimaPosicao = await this.getUltimaPosicaoFila();
    
    // Mover corretor para o final da fila
    await this.prisma.corretor.update({
      where: { id: corretorId },
      data: { posicaoFila: ultimaPosicao + 1 }
    });

    // Reordenar todas as posições
    await this.reordernarFila();
    
    this.logger.log(`Corretor ${corretor.nome} movido para o final da fila`);
  }

  async toggleAtivo(id: string): Promise<Corretor> {
    const corretor = await this.findById(id);
    if (!corretor) {
      throw new Error('Corretor não encontrado');
    }

    return this.prisma.corretor.update({
      where: { id },
      data: { ativo: !corretor.ativo }
    });
  }

  private async getUltimaPosicaoFila(): Promise<number> {
    const corretor = await this.prisma.corretor.findFirst({
      orderBy: { posicaoFila: 'desc' }
    });

    return corretor?.posicaoFila || 0;
  }

  private async reordernarFila(): Promise<void> {
    const corretores = await this.prisma.corretor.findMany({
      orderBy: { posicaoFila: 'asc' }
    });

    for (let i = 0; i < corretores.length; i++) {
      await this.prisma.corretor.update({
        where: { id: corretores[i].id },
        data: { posicaoFila: i + 1 }
      });
    }

    this.logger.log('Fila de corretores reordenada');
  }

  async getStatusFila() {
    const corretores = await this.findAll();
    const ativos = corretores.filter(c => c.ativo);
    const inativos = corretores.filter(c => !c.ativo);

    return {
      total: corretores.length,
      ativos: ativos.length,
      inativos: inativos.length,
      fila: ativos.map(c => ({
        id: c.id,
        nome: c.nome,
        telefone: c.telefone,
        posicao: c.posicaoFila
      }))
    };
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
}