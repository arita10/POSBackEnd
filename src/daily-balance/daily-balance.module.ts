import { Module } from '@nestjs/common';
import { DailyBalanceController } from './daily-balance.controller';
import { DailyBalanceService } from './daily-balance.service';

/**
 * @module DailyBalanceModule
 * @description Feature module for daily balance calculations.
 * Implements the Difference and Income Left (Devir) formulas.
 */
@Module({
  controllers: [DailyBalanceController],
  providers: [DailyBalanceService],
  exports: [DailyBalanceService],
})
export class DailyBalanceModule {}
