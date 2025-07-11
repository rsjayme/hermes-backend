import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly instanceName: string;

  constructor(private configService: ConfigService) {
    const apiUrl = this.configService.get('EVOLUTION_API_URL');
    const apiKey = this.configService.get('EVOLUTION_API_KEY');
    const instanceName = this.configService.get('EVOLUTION_INSTANCE_NAME');

    if (!apiUrl || !apiKey || !instanceName) {
      throw new Error('Configurações da Evolution API não encontradas no .env');
    }

    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    this.instanceName = instanceName;
  }

  async sendTextMessage(to: string, message: string): Promise<boolean> {
    try {
      const url = `${this.apiUrl}/message/sendText/${this.instanceName}`;

      const payload = {
        number: to,
        text: message
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey
        }
      });

      if (response.status >= 200 && response.status < 300) {
        this.logger.log(`Mensagem enviada com sucesso para: ${to} (Status: ${response.status})`);
        return true;
      } else {
        this.logger.error(`Erro ao enviar mensagem para ${to}: ${response.status} - ${response.statusText}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Erro ao enviar mensagem para ${to}:`, error.message);
      return false;
    }
  }

  async perguntarDisponibilidade(telefone: string, nomeCorretor: string): Promise<boolean> {
    const mensagem = `Olá ${nomeCorretor}! 👋

Temos um novo lead disponível para atendimento.

Você está disponível para atender agora?

Responda:
✅ *SIM* - para aceitar o lead
❌ *NÃO* - para passar para o próximo corretor

⏰ Você tem 5 minutos para responder, caso contrário o lead será direcionado para o próximo corretor da fila.`;

    return await this.sendTextMessage(telefone, mensagem);
  }

  async enviarDadosLead(telefone: string, dadosLead: { nome: string | null; telefone: string; mensagem?: string }): Promise<boolean> {
    const mensagem = `🎯 *LEAD ATRIBUÍDO*

📝 *Dados do Cliente:*
• Nome: ${dadosLead.nome || 'Não informado'}
• Telefone: ${dadosLead.telefone}

${dadosLead.mensagem ? `💬 *Mensagem inicial:*\n${dadosLead.mensagem}` : ''}

Entre em contato com o cliente o mais rápido possível! 🚀`;

    return await this.sendTextMessage(telefone, mensagem);
  }

  async notificarLeadRecusado(telefone: string): Promise<boolean> {
    const mensagem = `❌ *LEAD RECUSADO*

Você recusou o atendimento deste lead.

O lead foi direcionado para o próximo corretor da fila.

Continue disponível para o próximo lead! 💪`;

    return await this.sendTextMessage(telefone, mensagem);
  }

  async notificarLeadTimeout(telefone: string): Promise<boolean> {
    const mensagem = `⏰ *TIMEOUT - LEAD NÃO ATRIBUÍDO*

O lead não foi atribuído a você pois não respondeu no prazo de 5 minutos.

O lead foi direcionado para o próximo corretor da fila.

⚡ Seja mais rápido na próxima vez!`;

    return await this.sendTextMessage(telefone, mensagem);
  }

  async configurarWebhook(webhookUrl: string): Promise<boolean> {
    try {
      const url = `${this.apiUrl}/webhook/set/${this.instanceName}`;

      const payload = {
        enabled: true,
        url: webhookUrl,
        events: ['MESSAGES_UPSERT']
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey
        }
      });

      if (response.status >= 200 && response.status < 300) {
        this.logger.log(`Webhook configurado com sucesso: ${webhookUrl} (Status: ${response.status})`);
        return true;
      } else {
        this.logger.error(`Erro ao configurar webhook: ${response.status} - ${response.statusText}`);
        return false;
      }
    } catch (error) {
      this.logger.error('Erro ao configurar webhook:', error.message);
      return false;
    }
  }

  async getInstanceStatus(): Promise<any> {
    try {
      const url = `${this.apiUrl}/instance/connectionState/${this.instanceName}`;

      const response = await axios.get(url, {
        headers: {
          'apikey': this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      this.logger.error('Erro ao obter status da instância:', error.message);
      return null;
    }
  }
}