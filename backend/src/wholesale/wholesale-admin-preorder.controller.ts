// Updated: 2026-03-17T14:30:00 - Admin 预售限购：PUT/GET /wholesale/admin/preorder/limits/:skuId
// Updated: 2026-03-19T12:00:00 - 批发网站主管（SALES_SUPERVISOR）可管理预售限购
import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { PutPreorderLimitsDto } from './dto/preorder-limits.dto';

@ApiTags('Wholesale Admin Preorder')
@ApiBearerAuth()
@Controller('wholesale/admin/preorder/limits')
@UseGuards(RolesGuard)
@Roles(
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.SALES_SUPERVISOR,
  UserRole.CATALOG_ADMIN,
)
export class WholesaleAdminPreorderController {
  constructor(private readonly prisma: PrismaService) {}

  private async fetchLimits(skuId: string, tenantId: string) {
    const [global, tierLimits] = await Promise.all([
      this.prisma.preorderLimit.findUnique({
        where: { tenantId_skuId: { tenantId, skuId } },
      }),
      this.prisma.preorderTierLimit.findMany({
        where: { tenantId, skuId },
      }),
    ]);
    return {
      maxQtyPerOrder: global?.maxQtyPerOrder ?? null,
      tierLimits: tierLimits.map((t) => ({
        tier: t.tier,
        maxQtyPerOrder: t.maxQtyPerOrder,
      })),
    };
  }

  @Get(':skuId')
  @ApiOperation({ summary: '获取 SKU 预售限购配置' })
  async getLimits(
    @Param('skuId') skuId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    const sku = await this.prisma.sku.findFirst({
      where: { id: skuId, tenantId },
    });
    if (!sku) throw new NotFoundException('SKU not found');
    return this.fetchLimits(skuId, tenantId);
  }

  @Put(':skuId')
  @ApiOperation({ summary: '设置 SKU 预售限购配置' })
  async putLimits(
    @Param('skuId') skuId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() body: PutPreorderLimitsDto,
  ) {
    const sku = await this.prisma.sku.findFirst({
      where: { id: skuId, tenantId },
    });
    if (!sku) throw new NotFoundException('SKU not found');

    await this.prisma.$transaction(async (tx) => {
      if (body.maxQtyPerOrder !== undefined) {
        if (body.maxQtyPerOrder == null) {
          await tx.preorderLimit.deleteMany({
            where: { tenantId, skuId },
          });
        } else {
          await tx.preorderLimit.upsert({
            where: { tenantId_skuId: { tenantId, skuId } },
            create: {
              tenantId,
              skuId,
              maxQtyPerOrder: body.maxQtyPerOrder,
            },
            update: { maxQtyPerOrder: body.maxQtyPerOrder },
          });
        }
      }

      if (body.tierLimits !== undefined) {
        await tx.preorderTierLimit.deleteMany({ where: { tenantId, skuId } });
        for (const t of body.tierLimits) {
          await tx.preorderTierLimit.create({
            data: {
              tenantId,
              skuId,
              tier: t.tier,
              maxQtyPerOrder: t.maxQtyPerOrder,
            },
          });
        }
      }
    });

    return this.fetchLimits(skuId, tenantId);
  }
}
