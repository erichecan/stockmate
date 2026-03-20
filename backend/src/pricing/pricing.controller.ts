// Updated: 2026-03-17T14:32:00 - 等级折扣配置 API
// Updated: 2026-03-20T16:35:00 - PUT 限制为商品/价格维护岗位
import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PricingService } from './pricing.service';
import { PutTierDiscountsDto } from './dto/put-tier-discounts.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CATALOG_MAINTENANCE_ROLES } from '../common/constants/catalog-maintenance-roles';

@ApiTags('Pricing')
@ApiBearerAuth()
@Controller('pricing')
export class PricingController {
  constructor(private pricingService: PricingService) {}

  @Get('tier-discounts')
  @ApiOperation({ summary: 'Get tier discount policies for tenant' })
  @ApiResponse({ status: 200, description: 'Tier discount policies' })
  async getTierDiscounts(@CurrentUser('tenantId') tenantId: string) {
    return this.pricingService.getTierDiscounts(tenantId);
  }

  @Put('tier-discounts')
  @UseGuards(RolesGuard)
  @Roles(...CATALOG_MAINTENANCE_ROLES)
  @ApiOperation({ summary: 'Replace tier discount policies for tenant' })
  @ApiResponse({ status: 200, description: 'Tier discount policies updated' })
  async putTierDiscounts(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: PutTierDiscountsDto,
  ) {
    return this.pricingService.putTierDiscounts(tenantId, dto);
  }
}
