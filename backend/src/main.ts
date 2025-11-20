import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security headers
  app.use(helmet());

  // CORS configurado
  app.enableCors({
    origin: configService.get<string>('FRONTEND_URL'),
    methods: ['GET', 'POST'],
    credentials: true,
    maxAge: 3600,
  });

  // Validação global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove propriedades não definidas no DTO
      forbidNonWhitelisted: true, // Retorna erro se propriedades extras
      transform: true, // Transforma tipos automaticamente
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Server running on http://localhost:${port}`);
}
bootstrap();