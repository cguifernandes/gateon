import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { resolvePrismaRuntimePoolConfig } from '../../lib/prisma/database-connection';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const config = resolvePrismaRuntimePoolConfig();

    console.log({
      connectionString: config?.connectionString?.replace(/:.+@/, ':***@'),
      ssl: config.ssl,
    });

    const adapter = new PrismaPg(resolvePrismaRuntimePoolConfig());
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
