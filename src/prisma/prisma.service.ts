import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * @class PrismaService
 * @description The single database connection service for the entire application.
 * Extends PrismaClient so all Prisma methods (findMany, create, etc.) are available.
 *
 * WHY a service? NestJS uses Dependency Injection. Instead of creating
 * "new PrismaClient()" in every file, we create ONE service and inject it
 * wherever needed. This ensures:
 *   1. Single database connection pool (not 50 separate connections)
 *   2. Clean startup/shutdown lifecycle
 *   3. Easy to mock in unit tests
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  /**
   * @description Called automatically when NestJS starts.
   * Opens the database connection pool.
   */
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  /**
   * @description Called automatically when NestJS shuts down.
   * Closes all database connections gracefully.
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
