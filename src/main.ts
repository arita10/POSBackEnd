import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS: restrict which frontend domains can call this API.
  // Set ALLOWED_ORIGINS in .env as a comma-separated list for production.
  // Falls back to '*' only if not set (development only).
  const rawOrigins = process.env.ALLOWED_ORIGINS ?? process.env.ALLOWED_ORIGIN ?? '';
  const allowedOrigins = rawOrigins
    ? rawOrigins.split(',').map((s) => s.trim())
    : [];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      // Allow all localhost ports for development
      if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
      // Allow explicitly listed origins
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3333);
}
bootstrap();
