import { Controller, Get, Post, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { Roles } from '../auth/decorators/roles.decorator';

@Roles('OWNER')
@Controller('shops/:shopId/vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  findAll(@Param('shopId', ParseIntPipe) shopId: number) {
    return this.vendorsService.findAll(shopId);
  }

  @Post()
  create(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Body('vendorName') vendorName: string,
  ) {
    return this.vendorsService.create(shopId, vendorName);
  }

  @Delete(':id')
  remove(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.vendorsService.remove(shopId, id);
  }
}
