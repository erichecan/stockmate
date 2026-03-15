// Updated: 2026-03-14T15:32:00 - 批发站 P0: 未登录公共类目接口（按租户 slug 返回类目树）
import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from '../categories/categories.service';
import { TenantsService } from '../tenants/tenants.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Wholesale Public')
@Controller('wholesale/public')
export class WholesalePublicController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly tenantsService: TenantsService,
  ) {}

  @Get('categories')
  @Public()
  @ApiOperation({
    summary: 'Get public category tree for wholesale site by tenant slug',
  })
  @ApiQuery({
    name: 'tenantSlug',
    required: true,
    description: 'Tenant slug for which to load the category tree',
  })
  async getCategoryTree(@Query('tenantSlug') tenantSlug: string): Promise<any> {
    // Note: 2026-03-14T15:32:00 - 简化实现：根据 slug 解析租户，再复用现有类目树逻辑
    const tenant = await this.tenantsService.findBySlug(tenantSlug.trim());
    return this.categoriesService.findTree(tenant.id);
  }
}

