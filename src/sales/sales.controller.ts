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
  @Post()
  create(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Body() dto: CreateSaleDto,
  ) {
    return this.salesService.create(shopId, dto);
  }

  /**
   * @route GET /shops/:shopId/sales
   * @description List all sales for this shop, newest first.
   */
  @Get()
  findAll(@Param('shopId', ParseIntPipe) shopId: number) {
    return this.salesService.findAllByShop(shopId);
  }

  /**
   * @route GET /shops/:shopId/sales/daily?date=YYYY-MM-DD
   * @description Get total sales for a specific date.
   * Used by Phase 4 (Daily Balance).
   * @query {string} date - The date to summarize, e.g. "2026-02-12"
   */
  @Get('daily')
  getDailySummary(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Query('date') date: string,
  ) {
    const today = date || new Date().toISOString().split('T')[0];
    return this.salesService.getDailySummary(shopId, today);
  }

  /**
   * @route GET /shops/:shopId/sales/:id
   * @description Get a full receipt with all item details.
   */
  @Get(':id')
  findOne(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.salesService.findOne(shopId, id);
  }
}
