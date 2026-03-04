import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

/**
 * @module ProductsModule
 * @description Feature module for product and inventory management.
 * Handles Adet/KG stock math and product CRUD operations.
 */
@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
