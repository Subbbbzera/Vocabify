import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { json, urlencoded } from "express";
import { ConfigService } from "@nestjs/config";

async function startServer() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api');

  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  const rawOrigins = configService.get<string>('CORS_ORIGIN') || 'http://localhost:5173,http://127.0.0.1:5173';
  const corsOrigins = rawOrigins.split(',').map((origin) => origin.trim());

  app.enableCors({
    origin: (origin, callback) => {

      callback(null, true);
    },
    allowedHeaders: ['Content-Type', 'Authorization', 'user-id'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = configService.get<number>('PORT') || 5000;
  await app.listen(port, '0.0.0.0');
  console.log(`Server is running at: http://localhost:${port}/api`);
}

startServer().catch((err) => {
  console.error("Error starting server:", err);
});
