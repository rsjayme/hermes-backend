import { Module } from '@nestjs/common';
import { CorretorController } from './corretor.controller';
import { CorretorService } from './corretor.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CorretorController],
  providers: [CorretorService],
  exports: [CorretorService],
})
export class CorretorModule {}