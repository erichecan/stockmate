// Updated: 2026-02-28T17:00:00 - CORS 支持 Cloud Run 域名，避免生产环境跨域
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

/** CORS：env 显式配置 + 任意 *.run.app（Cloud Run）+ localhost */
function getAllowedOrigins(): string[] {
  const fromEnv = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    : [];
  // 2026-03-14T19:50:00 本地开发: 允许批发站前端 4000 端口访问
  const localhost = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:4000',
    'http://127.0.0.1:4000',
  ];
  return fromEnv.length ? [...fromEnv, ...localhost] : localhost;
}

/** Cloud Run 域名：xxx.run.app 或 xxx.region.run.app 等 */
const CLOUD_RUN_ORIGIN = /^https:\/\/[a-zA-Z0-9.-]+\.run\.app$/;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsOrigins = getAllowedOrigins();
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) return callback(null, true);
      const inList = corsOrigins.includes(origin);
      const isCloudRun = CLOUD_RUN_ORIGIN.test(origin);
      callback(null, inList || isCloudRun);
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('StockFlow API')
    .setDescription('StockFlow multi-tenant inventory management API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Updated: 2026-02-26T16:20:00 - Cloud Run 需监听 0.0.0.0
  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3001);
  await app.listen(port, '0.0.0.0');
  console.log(`StockFlow API running on http://localhost:${port}`);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
