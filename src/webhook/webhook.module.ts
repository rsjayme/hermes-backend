import { Module, forwardRef } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LeadModule } from '../lead/lead.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [PrismaModule, forwardRef(() => LeadModule), WhatsAppModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
