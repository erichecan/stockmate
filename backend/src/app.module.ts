// Updated: 2026-03-14 - 阶段一底座：注册 ActionLogModule
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { ActionLogModule } from './action-log/action-log.module';
import { CategoriesModule } from './categories/categories.module';
import { BrandsModule } from './brands/brands.module';
import { ProductsModule } from './products/products.module';
import { SkusModule } from './skus/skus.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchasingModule } from './purchasing/purchasing.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { InventoryModule } from './inventory/inventory.module';
import { BarcodeModule } from './barcode/barcode.module';
import { CustomersModule } from './customers/customers.module';
import { SalesOrdersModule } from './sales-orders/sales-orders.module';
import { StockFreezeModule } from './stock-freeze/stock-freeze.module';
import { GoodsOwnerModule } from './goods-owner/goods-owner.module';
import { PrintSolutionModule } from './print-solution/print-solution.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { WholesaleModule } from './wholesale/wholesale.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    // Updated: 2026-02-28T10:35:00 - increased rate limit for development
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 300 }]),
    PrismaModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    ActionLogModule,
    CategoriesModule,
    BrandsModule,
    ProductsModule,
    SkusModule,
    SuppliersModule,
    PurchasingModule,
    WarehousesModule,
    InventoryModule,
    BarcodeModule,
    CustomersModule,
    SalesOrdersModule,
    StockFreezeModule,
    GoodsOwnerModule,
    PrintSolutionModule,
    // Updated: 2026-03-14T15:34:00 - 批发站 P0: 挂载 WholesaleModule（批发站前台 API 聚合层）
    WholesaleModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
