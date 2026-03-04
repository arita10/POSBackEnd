import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

/**
 * @module ExpensesModule
 * @description Feature module for business expense tracking.
 * Expense totals feed into Phase 4's Daily Balance calculation.
 */
@Module({
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
