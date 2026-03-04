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
import { DailyBalanceModule } from './daily-balance/daily-balance.module';
import { AiPriceAgentModule } from './ai-price-agent/ai-price-agent.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';

/**
 * @module AppModule
 * @description The root module of the POS Bakkal SaaS application.
 * PrismaModule is imported here with @Global(), making database
 * access available to all feature modules automatically.
 *
 * Phase 1: PrismaModule, ShopsModule, UsersModule, PermissionsModule
 * Phase 2: ProductUnitsModule, ProductsModule, PriceComparisonModule
 * Phase 3: SalesModule, ExpensesModule
 * Phase 4: DailyBalanceModule
 * Phase 5: AiPriceAgentModule
 */
@Module({
  imports: [
    PrismaModule,
    ShopsModule,
    UsersModule,
    PermissionsModule,
    ProductUnitsModule,
    ProductsModule,
    PriceComparisonModule,
    SalesModule,
    ExpensesModule,
    DailyBalanceModule,
    AiPriceAgentModule,
    AuthModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply JWT check to ALL routes globally
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Apply role check to ALL routes globally
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
