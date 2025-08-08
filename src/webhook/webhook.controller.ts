import { Controller, Post, Body, Logger } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Public()
  @Post('messages')
  async handleMessage(@Body() payload: any) {
    this.logger.log('Webhook recebido:', JSON.stringify(payload, null, 2));

    try {
      await this.webhookService.processMessage(payload);
      return { status: 'success', message: 'Mensagem processada com sucesso' };
    } catch (error) {
      this.logger.error('Erro ao processar mensagem:', error);
      return { status: 'error', message: 'Erro ao processar mensagem' };
    }
  }
}
