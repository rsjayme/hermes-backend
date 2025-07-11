import { Module, forwardRef } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LeadModule } from '../lead/lead.module';

@Module({
  imports: [PrismaModule, forwardRef(() => LeadModule)],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}