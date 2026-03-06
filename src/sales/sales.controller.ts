import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * @controller SalesController
 * @description Handles HTTP requests for sales transactions.
 * Base route: /shops/:shopId/sales
 *
 * Endpoints:
 *   POST /shops/:shopId/sales              → Record a new sale (full receipt)
 *   GET  /shops/:shopId/sales              → List all sales
 *   GET  /shops/:shopId/sales/daily?date=  → Daily sales summary
 *   GET  /shops/:shopId/sales/:id          → Get one receipt in full
 */
@Controller('shops/:shopId/sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  /**
   * @route POST /shops/:shopId/sales
   * @description Record a complete sale. Deducts stock automatically.
   * @body {CreateSaleDto} dto - { userId, items: [{productId, quantity}] }
   */
  // STAFF allowed — cashier creates sales
  @Roles('OWNER', 'STAFF')
  @Post()
  create(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Body() dto: CreateSaleDto,
  ) {
    return this.salesService.create(shopId, dto);
  }

  // OWNER only — only owner views full sales history/reports
  @Roles('OWNER')
  @Get()
  findAll(@Param('shopId', ParseIntPipe) shopId: number) {
    return this.salesService.findAllByShop(shopId);
  }

  // OWNER only — daily summary for balance closing
  @Roles('OWNER')
  @Get('daily')
  getDailySummary(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Query('date') date: string,
  ) {
    const today = date || new Date().toISOString().split('T')[0];
    return this.salesService.getDailySummary(shopId, today);
  }

  // OWNER only — per-product profit report
  @Roles('OWNER')
  @Get('profit-report')
  getProfitReport(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const today = new Date().toISOString().split('T')[0];
    return this.salesService.getProfitReport(shopId, from || today, to || today);
  }

  // OWNER only — receipt details are financial records
  @Roles('OWNER')
  @Get(':id')
  findOne(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.salesService.findOne(shopId, id);
  }
}
