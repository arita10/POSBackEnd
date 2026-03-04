import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * @controller ProductsController
 * @description Handles HTTP requests for product and inventory management.
 * Base route: /shops/:shopId/products
 *
 * Endpoints:
 *   POST   /shops/:shopId/products                    → Add a new product
 *   GET    /shops/:shopId/products                    → List all products
 *   GET    /shops/:shopId/products/:id                → Get one product
 *   PUT    /shops/:shopId/products/:id                → Update product details
 *   POST   /shops/:shopId/products/:id/adjust-stock   → Add/remove stock
 *   DELETE /shops/:shopId/products/:id                → Delete a product
 */
@Controller('shops/:shopId/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * @route POST /shops/:shopId/products
   * @description Add a new product to the shop's inventory.
   * @body {CreateProductDto} dto - { unitId, barcode?, productName, salePrice, stockQuantity? }
   */
  // OWNER only — staff cannot add products
  @Roles('OWNER')
  @Post()
  create(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(shopId, dto);
  }

  // STAFF allowed — staff needs to see product list to make sales
  @Roles('OWNER', 'STAFF')
  @Get()
  findAll(@Param('shopId', ParseIntPipe) shopId: number) {
    return this.productsService.findAllByShop(shopId);
  }

  // STAFF allowed — staff needs product detail for sales screen
  @Roles('OWNER', 'STAFF')
  @Get(':id')
  findOne(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productsService.findOne(shopId, id);
  }

  // OWNER only — only owner can change prices/names
  @Roles('OWNER')
  @Put(':id')
  update(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(shopId, id, dto);
  }

  // OWNER only — only owner manages stock deliveries
  @Roles('OWNER')
  @Post(':id/adjust-stock')
  adjustStock(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdjustStockDto,
  ) {
    return this.productsService.adjustStock(shopId, id, dto);
  }

  // OWNER only — only owner can delete products
  @Roles('OWNER')
  @Delete(':id')
  remove(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productsService.remove(shopId, id);
  }
}
