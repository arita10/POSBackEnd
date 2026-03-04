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
  @Post()
  create(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(shopId, dto);
  }

  /**
   * @route GET /shops/:shopId/products
   * @description List all products in the shop's inventory.
   */
  @Get()
  findAll(@Param('shopId', ParseIntPipe) shopId: number) {
    return this.productsService.findAllByShop(shopId);
  }

  /**
   * @route GET /shops/:shopId/products/:id
   * @description Get a single product with its unit and price comparisons.
   */
  @Get(':id')
  findOne(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productsService.findOne(shopId, id);
  }

  /**
   * @route PUT /shops/:shopId/products/:id
   * @description Update product details (name, price, barcode, etc.)
   */
  @Put(':id')
  update(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(shopId, id, dto);
  }

  /**
   * @route POST /shops/:shopId/products/:id/adjust-stock
   * @description Add or remove stock for a product.
   * @body {AdjustStockDto} dto - { type: "add"|"remove", quantity: number }
   *
   * EXAMPLES:
   *   New delivery:    { "type": "add",    "quantity": 24 }
   *   Damaged goods:   { "type": "remove", "quantity": 2 }
   *   KG delivery:     { "type": "add",    "quantity": 3.500 }
   */
  @Post(':id/adjust-stock')
  adjustStock(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdjustStockDto,
  ) {
    return this.productsService.adjustStock(shopId, id, dto);
  }

  /**
   * @route DELETE /shops/:shopId/products/:id
   * @description Delete a product from the inventory.
   */
  @Delete(':id')
  remove(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productsService.remove(shopId, id);
  }
}
