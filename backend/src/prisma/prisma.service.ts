// Updated: 2026-02-28T17:40:00 - 使用 poolQueryViaFetch 走 HTTP 避免 WebSocket/fetch 失败
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';

// Cloud Run 上 WebSocket 连接失败，改用 HTTP fetch 模式
neonConfig.poolQueryViaFetch = true;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaNeon({
      connectionString: process.env['DATABASE_URL']!,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
