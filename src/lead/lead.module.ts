import { Module, forwardRef } from '@nestjs/common';
import { LeadController } from './lead.controller';
import { LeadService } from './lead.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CorretorModule } from '../corretor/corretor.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { TimeoutModule } from '../timeout/timeout.module';

@Module({
  imports: [PrismaModule, CorretorModule, WhatsAppModule, TimeoutModule],
  controllers: [LeadController],
  providers: [LeadService],
  exports: [LeadService],
})
export class LeadModule {}
