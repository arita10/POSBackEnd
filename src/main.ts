import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS: restrict which frontend domains can call this API.
  // Set ALLOWED_ORIGIN in .env for production (e.g. https://mybakal.com).
  // Falls back to '*' only if not set (development only).
  const allowedOrigin = process.env.ALLOWED_ORIGIN ?? '*';
  app.enableCors({
    origin: allowedOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });

  await app.listen(process.env.PORT ?? 3333);
}
bootstrap();
