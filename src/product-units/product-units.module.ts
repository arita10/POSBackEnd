import { Module } from '@nestjs/common';
import { ProductUnitsController } from './product-units.controller';
import { ProductUnitsService } from './product-units.service';

/**
 * @module ProductUnitsModule
 * @description Feature module for product unit management (Adet, KG, Litre, etc.)
 */
@Module({
  controllers: [ProductUnitsController],
  providers: [ProductUnitsService],
  exports: [ProductUnitsService],
})
export class ProductUnitsModule {}
