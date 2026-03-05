import { Module } from '@nestjs/common';
import { DailyBalanceController } from './daily-balance.controller';
import { DailyBalanceService } from './daily-balance.service';
import { ExpensesModule } from '../expenses/expenses.module';

@Module({
  imports: [ExpensesModule],
  controllers: [DailyBalanceController],
  providers: [DailyBalanceService],
  exports: [DailyBalanceService],
})
export class DailyBalanceModule {}
