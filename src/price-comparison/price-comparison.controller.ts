import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { PriceComparisonService } from './price-comparison.service';
import { UpsertPriceComparisonDto } from './dto/upsert-price-comparison.dto';

/**
 * @controller PriceComparisonController
 * @description Handles HTTP requests for competitor price comparisons.
 * Base route: /shops/:shopId/products/:productId/price-comparisons
 *
 * Endpoints:
 *   POST   /shops/:shopId/products/:productId/price-comparisons       → Add/update competitor price
 *   GET    /shops/:shopId/products/:productId/price-comparisons       → List all competitor prices
 *   DELETE /shops/:shopId/products/:productId/price-comparisons/:id   → Remove a comparison
 */
@Controller('shops/:shopId/products/:productId/price-comparisons')
export class PriceComparisonController {
  constructor(
    private readonly priceComparisonService: PriceComparisonService,
  ) {}

  /**
   * @route POST /shops/:shopId/products/:productId/price-comparisons
   * @description Add or update a competitor's price for this product.
   * If the competitor already has an entry, it updates the price.
   * @body {UpsertPriceComparisonDto} dto - { competitorName, competitorPrice }
   */
  @Post()
  upsert(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: UpsertPriceComparisonDto,
  ) {
    return this.priceComparisonService.upsert(shopId, productId, dto);
  }

  /**
   * @route GET /shops/:shopId/products/:productId/price-comparisons
   * @description List all competitor prices for this product, sorted cheapest first.
   */
  @Get()
  findByProduct(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.priceComparisonService.findByProduct(shopId, productId);
  }

  /**
   * @route DELETE /shops/:shopId/products/:productId/price-comparisons/:id
   * @description Remove a competitor price entry.
   */
  @Delete(':id')
  remove(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('productId', ParseIntPipe) productId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.priceComparisonService.remove(shopId, productId, id);
  }
}
