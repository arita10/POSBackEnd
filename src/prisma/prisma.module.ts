import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * @module PrismaModule
 * @description Makes PrismaService available to the ENTIRE application.
 *
 * The @Global() decorator means we don't need to import PrismaModule
 * in every feature module. Any module can inject PrismaService directly.
 *
 * WITHOUT @Global(): Every module (ShopsModule, UsersModule, etc.)
 *   would need: imports: [PrismaModule]
 *
 * WITH @Global(): Just import once in AppModule, available everywhere.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
