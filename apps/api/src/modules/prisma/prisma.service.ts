import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { resolvePrismaRuntimePoolConfig } from '../../lib/prisma/database-connection';
import { Client } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaPg(resolvePrismaRuntimePoolConfig());
    super({ adapter });
  }

  async onModuleInit() {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });

    try {
      await client.connect();
      console.log('✅ PG CONNECT OK');

      const result = await client.query('SELECT 1');
      console.log(result.rows);

      await client.end();
    } catch (e) {
      console.error('❌ PG ERROR');
      console.error(e);
    }

    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
