// Updated: 2026-02-28T10:00:00
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { BrandsModule } from './brands/brands.module';
import { ProductsModule } from './products/products.module';
import { SkusModule } from './skus/skus.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchasingModule } from './purchasing/purchasing.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { InventoryModule } from './inventory/inventory.module';
import { BarcodeModule } from './barcode/barcode.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

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
    CategoriesModule,
    BrandsModule,
    ProductsModule,
    SkusModule,
    SuppliersModule,
    PurchasingModule,
    WarehousesModule,
    InventoryModule,
    BarcodeModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
