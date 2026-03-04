import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { DailyBalanceService } from './daily-balance.service';
import { CloseDayDto } from './dto/close-day.dto';

/**
 * @controller DailyBalanceController
 * @description Handles HTTP requests for daily balance (Gün Sonu Kapanış).
 * Base route: /shops/:shopId/daily-balance
 *
 * Endpoints:
 *   GET  /shops/:shopId/daily-balance/preview?date=  → Preview today's totals before closing
 *   POST /shops/:shopId/daily-balance/close          → Close the day (run both formulas)
 *   GET  /shops/:shopId/daily-balance                → History of all balance records
 *   GET  /shops/:shopId/daily-balance/:id            → Single balance record
 */
@Controller('shops/:shopId/daily-balance')
export class DailyBalanceController {
  constructor(private readonly dailyBalanceService: DailyBalanceService) {}

  /**
   * @route GET /shops/:shopId/daily-balance/preview?date=YYYY-MM-DD
   * @description Preview system totals for the day before closing.
   * Owner uses this to see today's sales and expenses, then enters
   * their manual count to preview the difference result.
   * @query {string} date - Date to preview e.g. "2026-02-20"
   */
  @Get('preview')
  preview(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Query('date') date: string,
  ) {
    const today = date || new Date().toISOString().split('T')[0];
    return this.dailyBalanceService.preview(shopId, today);
  }

  /**
   * @route POST /shops/:shopId/daily-balance/close
   * @description Close the day. Runs both formulas and saves permanently.
   * Can only be called ONCE per day.
   * @body {CloseDayDto} dto - { recordDate, cashCountManual, creditCountManual, debtCountManual }
   */
  @Post('close')
  closeDay(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Body() dto: CloseDayDto,
  ) {
    return this.dailyBalanceService.closeDay(shopId, dto);
  }

  /**
   * @route GET /shops/:shopId/daily-balance
   * @description Get the full history of daily balance records.
   */
  @Get()
  findAll(@Param('shopId', ParseIntPipe) shopId: number) {
    return this.dailyBalanceService.findAll(shopId);
  }

  /**
   * @route GET /shops/:shopId/daily-balance/:id
   * @description Get one specific day's balance record.
   */
  @Get(':id')
  findOne(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.dailyBalanceService.findOne(shopId, id);
  }
}
