import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const port = process.env.PORT || 3333;
  const app = await NestFactory.create(AppModule);

  // Configurar limite de payload para webhooks grandes
  app.use('/webhook/messages', bodyParser.json({ limit: '50mb' }));
  app.use('/webhook/messages', bodyParser.urlencoded({ limit: '50mb', extended: true }));

  await app.listen(port);
  console.log(`Application running on port ${port}`);
}

void bootstrap();
