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
import { ShopsService } from './shops.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';

/**
 * @controller ShopsController
 * @description Handles HTTP requests for Shop (tenant) management.
 * Base route: /shops
 *
 * Endpoints:
 *   POST   /shops       → Create a new shop
 *   GET    /shops       → List all shops (admin)
 *   GET    /shops/:id   → Get one shop with its users
 *   PUT    /shops/:id   → Update shop details
 *   DELETE /shops/:id   → Delete a shop permanently
 */
@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  /**
   * @route POST /shops
   * @description Register a new bakkal shop.
   * @body {CreateShopDto} dto - { shopName: "Ali'nin Bakkalı" }
   */
  @Post()
  create(@Body() dto: CreateShopDto) {
    return this.shopsService.create(dto);
  }

  /**
   * @route GET /shops
   * @description List all registered shops with user counts.
   */
  @Get()
  findAll() {
    return this.shopsService.findAll();
  }

  /**
   * @route GET /shops/:id
   * @description Get a single shop with its users list.
   * @param {number} id - Shop ID from URL parameter.
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.shopsService.findOne(id);
  }

  /**
   * @route PUT /shops/:id
   * @description Update a shop's name or status.
   * @param {number} id - Shop ID from URL parameter.
   * @body {UpdateShopDto} dto - Fields to update.
   */
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateShopDto) {
    return this.shopsService.update(id, dto);
  }

  /**
   * @route DELETE /shops/:id
   * @description Permanently delete a shop and all its data.
   * @param {number} id - Shop ID from URL parameter.
   */
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.shopsService.remove(id);
  }
}
