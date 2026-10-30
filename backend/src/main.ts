import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cabeceras de seguridad HTTP (OWASP). Se permite Swagger UI inline.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Prefijo global: la API vive bajo /api (coincide con el proxy del frontend).
  app.setGlobalPrefix('api');

  // Validación y saneamiento de DTOs en toda la app.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS para el frontend de desarrollo.
  app.enableCors({ origin: ['http://localhost:5173'], credentials: true });

  // OpenAPI / Swagger v3 (criterio de aceptación técnica del documento).
  const config = new DocumentBuilder()
    .setTitle('SIGO-Dental API')
    .setDescription('API de gestión odontológica — Fase 1 (Core y Turnos)')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`SIGO-Dental API en http://localhost:${port}/api`);
  console.log(`Swagger en http://localhost:${port}/api/docs`);
}
bootstrap();
