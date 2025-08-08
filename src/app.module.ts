import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { WebhookModule } from './webhook/webhook.module';
import { CorretorModule } from './corretor/corretor.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { TimeoutModule } from './timeout/timeout.module';
import { LeadModule } from './lead/lead.module';
import { RelatoriosModule } from './relatorios/relatorios.module';
import { InteracoesModule } from './interacoes/interacoes.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    WebhookModule,
    CorretorModule,
    WhatsAppModule,
    TimeoutModule,
    LeadModule,
    RelatoriosModule,
    InteracoesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
