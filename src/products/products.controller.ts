import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('shops/:shopId/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Roles('OWNER')
  @Post()
  create(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(shopId, dto);
  }

  @Roles('OWNER', 'STAFF')
  @Get()
  findAll(@Param('shopId', ParseIntPipe) shopId: number) {
    return this.productsService.findAllByShop(shopId);
  }

  @Roles('OWNER', 'STAFF')
  @Get(':id')
  findOne(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productsService.findOne(shopId, id);
  }

  @Roles('OWNER')
  @Get(':id/price-history')
  getPriceHistory(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productsService.getPriceHistory(shopId, id);
  }

  @Roles('OWNER')
  @Put(':id')
  update(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @Req() req: any,
  ) {
    const changedBy: number | undefined = req.user?.sub;
    return this.productsService.update(shopId, id, dto, changedBy);
  }

  @Roles('OWNER')
  @Post(':id/adjust-stock')
  adjustStock(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdjustStockDto,
  ) {
    return this.productsService.adjustStock(shopId, id, dto);
  }

  @Roles('OWNER')
  @Delete(':id')
  remove(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productsService.remove(shopId, id);
  }
}
