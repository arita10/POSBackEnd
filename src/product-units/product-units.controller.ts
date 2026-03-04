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
import { ProductUnitsService } from './product-units.service';
import { CreateProductUnitDto } from './dto/create-product-unit.dto';
import { UpdateProductUnitDto } from './dto/update-product-unit.dto';

/**
 * @controller ProductUnitsController
 * @description Handles HTTP requests for product unit management.
 * Base route: /shops/:shopId/product-units
 *
 * WHY nested under /shops/:shopId?
 * Units belong to a shop. Each shop can have different unit types.
 *
 * Endpoints:
 *   POST   /shops/:shopId/product-units       → Create a unit (e.g. "KG")
 *   GET    /shops/:shopId/product-units       → List all units in this shop
 *   GET    /shops/:shopId/product-units/:id   → Get one unit
 *   PUT    /shops/:shopId/product-units/:id   → Rename a unit
 *   DELETE /shops/:shopId/product-units/:id   → Delete a unit
 */
@Controller('shops/:shopId/product-units')
export class ProductUnitsController {
  constructor(private readonly productUnitsService: ProductUnitsService) {}

  /**
   * @route POST /shops/:shopId/product-units
   * @description Create a new measurement unit in this shop.
   * @param {number} shopId - The shop ID from the URL.
   * @body {CreateProductUnitDto} dto - { unitName: "KG" }
   */
  @Post()
  create(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Body() dto: CreateProductUnitDto,
  ) {
    return this.productUnitsService.create(shopId, dto);
  }

  /**
   * @route GET /shops/:shopId/product-units
   * @description List all measurement units in this shop.
   */
  @Get()
  findAll(@Param('shopId', ParseIntPipe) shopId: number) {
    return this.productUnitsService.findAllByShop(shopId);
  }

  /**
   * @route GET /shops/:shopId/product-units/:id
   * @description Get a single unit from this shop.
   */
  @Get(':id')
  findOne(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productUnitsService.findOne(shopId, id);
  }

  /**
   * @route PUT /shops/:shopId/product-units/:id
   * @description Update a unit's name in this shop.
   */
  @Put(':id')
  update(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductUnitDto,
  ) {
    return this.productUnitsService.update(shopId, id, dto);
  }

  /**
   * @route DELETE /shops/:shopId/product-units/:id
   * @description Delete a unit from this shop.
   */
  @Delete(':id')
  remove(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productUnitsService.remove(shopId, id);
  }
}
