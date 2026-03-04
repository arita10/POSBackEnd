import { Module } from '@nestjs/common';
import { ShopsController } from './shops.controller';
import { ShopsService } from './shops.service';

/**
 * @module ShopsModule
 * @description Feature module for Shop (tenant) management.
 * PrismaService is available automatically via @Global() PrismaModule.
 */
@Module({
  controllers: [ShopsController],
  providers: [ShopsService],
  exports: [ShopsService],
})
export class ShopsModule {}
