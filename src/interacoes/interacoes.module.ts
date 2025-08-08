import { Module } from '@nestjs/common';
import { InteracoesController } from './interacoes.controller';
import { InteracoesService } from './interacoes.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InteracoesController],
  providers: [InteracoesService],
  exports: [InteracoesService],
})
export class InteracoesModule {}