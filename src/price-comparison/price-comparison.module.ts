import { Module } from '@nestjs/common';
import { PriceComparisonController } from './price-comparison.controller';
import { PriceComparisonService } from './price-comparison.service';

/**
 * @module PriceComparisonModule
 * @description Feature module for competitor price comparison management.
 * Will be used by the AI agent in Phase 5.
 */
@Module({
  controllers: [PriceComparisonController],
  providers: [PriceComparisonService],
  exports: [PriceComparisonService],
})
export class PriceComparisonModule {}
