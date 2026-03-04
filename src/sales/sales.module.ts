import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

/**
 * @module SalesModule
 * @description Feature module for sales transaction management.
 * Implements the Header-Detail pattern with atomic stock deduction.
 */
@Module({
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
