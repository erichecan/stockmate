// Updated: 2026-03-14T17:35:00 - 批发站 P0: 注册批发站相关控制器（公共/商品/购物车/订单）
import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { ProductsModule } from '../products/products.module';
import { SkusModule } from '../skus/skus.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CustomersModule } from '../customers/customers.module';
import { SalesOrdersModule } from '../sales-orders/sales-orders.module';
import { TenantsModule } from '../tenants/tenants.module';
import { WholesalePublicController } from './wholesale-public.controller';
import { WholesaleProductsController } from './wholesale-products.controller';
import { WholesaleCartController } from './wholesale-cart.controller';
import { WholesaleOrdersController } from './wholesale-orders.controller';

@Module({
  imports: [
    CategoriesModule,
    ProductsModule,
    SkusModule,
    InventoryModule,
    CustomersModule,
    SalesOrdersModule,
    TenantsModule,
  ],
  controllers: [
    WholesalePublicController,
    WholesaleProductsController,
    WholesaleCartController,
    WholesaleOrdersController,
  ],
})
export class WholesaleModule {}

