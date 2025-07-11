import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TimeoutService {
  private readonly logger = new Logger(TimeoutService.name);
  private timeouts = new Map<string, NodeJS.Timeout>();
  private readonly timeoutMinutes: number;

  constructor(private configService: ConfigService) {
    this.timeoutMinutes = parseInt(this.configService.get('TIMEOUT_MINUTES') || '5');
  }

  createTimeout(interacaoId: string, callback: () => void): void {
    this.clearTimeout(interacaoId);
    
    const timeout = setTimeout(() => {
      this.logger.log(`Timeout executado para interação: ${interacaoId}`);
      callback();
      this.timeouts.delete(interacaoId);
    }, this.timeoutMinutes * 60 * 1000);

    this.timeouts.set(interacaoId, timeout);
    this.logger.log(`Timeout criado para interação: ${interacaoId} (${this.timeoutMinutes} minutos)`);
  }

  clearTimeout(interacaoId: string): void {
    const timeout = this.timeouts.get(interacaoId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(interacaoId);
      this.logger.log(`Timeout cancelado para interação: ${interacaoId}`);
    }
  }

  hasTimeout(interacaoId: string): boolean {
    return this.timeouts.has(interacaoId);
  }

  getActiveTimeouts(): string[] {
    return Array.from(this.timeouts.keys());
  }
}