import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const port = process.env.PORT || 3333;
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS para todas as origens
  app.enableCors({
    origin: true, // Permite todas as origens
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Configurar middleware JSON globalmente
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  // Configurar limite maior para webhooks
  app.use('/webhook/messages', bodyParser.json({ limit: '50mb' }));
  app.use(
    '/webhook/messages',
    bodyParser.urlencoded({ limit: '50mb', extended: true }),
  );

  // Criar usuário admin padrão se não existir
  const usersService = app.get(UsersService);
  const defaultAdmin = await usersService.createDefaultAdmin();
  
  if (defaultAdmin) {
    console.log('👨‍💼 Usuário administrador padrão criado:');
    console.log(`Email: ${defaultAdmin.email}`);
    console.log('Senha: admin123');
    console.log('⚠️  Altere a senha após o primeiro login!');
  }

  await app.listen(port);
  console.log(`Application running on port ${port}`);
  console.log(`CORS enabled for all origins`);
}

void bootstrap();
