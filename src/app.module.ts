import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { PrismaModule } from './prisma/prisma.module';
import { ShopsModule } from './shops/shops.module';
import { UsersModule } from './users/users.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ProductUnitsModule } from './product-units/product-units.module';
import { ProductsModule } from './products/products.module';
import { PriceComparisonModule } from './price-comparison/price-comparison.module';
import { SalesModule } from './sales/sales.module';
import { ExpensesModule } from './expenses/expenses.module';
import { VendorsModule } from './vendors/vendors.module';
import { DailyBalanceModule } from './daily-balance/daily-balance.module';
import { AiPriceAgentModule } from './ai-price-agent/ai-price-agent.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    PrismaModule, ShopsModule, UsersModule, PermissionsModule,
    ProductUnitsModule, ProductsModule, PriceComparisonModule,
    SalesModule, ExpensesModule, VendorsModule, DailyBalanceModule,
    AiPriceAgentModule, AuthModule, AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
