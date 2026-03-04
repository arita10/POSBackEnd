import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allow frontend to call this backend from any origin during development.
  // In production, replace '*' with your actual frontend domain:
  // e.g. origin: 'https://mybakal.com'
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });

  await app.listen(process.env.PORT ?? 3333);
}
bootstrap();
