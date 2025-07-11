import { Controller, Get, Post, Body } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Get('status')
  async getStatus() {
    return await this.whatsappService.getInstanceStatus();
  }

  @Post('configure-webhook')
  async configureWebhook(@Body() data: { webhookUrl: string }) {
    const success = await this.whatsappService.configurarWebhook(data.webhookUrl);
    return { success, message: success ? 'Webhook configurado com sucesso' : 'Erro ao configurar webhook' };
  }

  @Post('send-message')
  async sendMessage(@Body() data: { to: string; message: string }) {
    const success = await this.whatsappService.sendTextMessage(data.to, data.message);
    return { success, message: success ? 'Mensagem enviada com sucesso' : 'Erro ao enviar mensagem' };
  }
}