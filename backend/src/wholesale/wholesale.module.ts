// Updated: 2026-03-17T14:30:00 - 批发 DRAFT：WholesaleOrdersService、Reorder、Admin 预售限购
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
import { WholesaleReorderController } from './wholesale-reorder.controller';
import { WholesaleAdminPreorderController } from './wholesale-admin-preorder.controller';
import { WholesaleOrdersService } from './wholesale-orders.service';

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
    WholesaleReorderController,
    WholesaleAdminPreorderController,
  ],
  providers: [WholesaleOrdersService],
})
export class WholesaleModule {}
