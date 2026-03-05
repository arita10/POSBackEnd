import { Controller, Get, Post, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { DailyBalanceService } from './daily-balance.service';
import { CloseDayDto } from './dto/close-day.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@Roles('OWNER')
@Controller('shops/:shopId/daily-balance')
export class DailyBalanceController {
  constructor(private readonly dailyBalanceService: DailyBalanceService) {}

  /** Preview totals before closing. Pass ?date=YYYY-MM-DD&dunDevir=N */
  @Get('preview')
  preview(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Query('date') date: string,
    @Query('dunDevir') dunDevir?: string,
  ) {
    const today = date || new Date().toISOString().split('T')[0];
    return this.dailyBalanceService.preview(shopId, today, parseFloat(dunDevir ?? '0'));
  }

  /** Close the day — runs all three formulas and saves permanently */
  @Post('close')
  closeDay(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Body() dto: CloseDayDto,
  ) {
    return this.dailyBalanceService.closeDay(shopId, dto);
  }

  /** Report: ?period=daily|weekly|monthly&date=YYYY-MM-DD */
  @Get('report')
  getReport(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Query('period') period: string,
    @Query('date') date: string,
  ) {
    const today = date || new Date().toISOString().split('T')[0];
    const p = ['daily', 'weekly', 'monthly'].includes(period) ? period : 'daily';
    return this.dailyBalanceService.getReport(shopId, p, today);
  }

  @Get()
  findAll(@Param('shopId', ParseIntPipe) shopId: number) {
    return this.dailyBalanceService.findAll(shopId);
  }

  @Get(':id')
  findOne(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.dailyBalanceService.findOne(shopId, id);
  }
}
