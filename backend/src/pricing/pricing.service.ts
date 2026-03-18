// Updated: 2026-03-17T14:32:00 - 等级折扣配置 service
import { Injectable } from '@nestjs/common';
import { CustomerTier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PutTierDiscountsDto } from './dto/put-tier-discounts.dto';

@Injectable()
export class PricingService {
  constructor(private prisma: PrismaService) {}

  /** GET /pricing/tier-discounts - 按 tenantId 隔离 */
  async getTierDiscounts(tenantId: string) {
    return this.prisma.tierDiscountPolicy.findMany({
      where: { tenantId },
      orderBy: { tier: 'asc' },
    });
  }

  /** PUT /pricing/tier-discounts - 全量替换，按 tenantId 隔离 */
  async putTierDiscounts(tenantId: string, dto: PutTierDiscountsDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.tierDiscountPolicy.deleteMany({ where: { tenantId } });
      if (dto.policies.length === 0) return [];
      const created = await tx.tierDiscountPolicy.createManyAndReturn({
        data: dto.policies.map((p) => ({
          tenantId,
          tier: p.tier,
          discountPercent: p.discountPercent,
          isActive: p.isActive ?? true,
          effectiveFrom: p.effectiveFrom ? new Date(p.effectiveFrom) : null,
          effectiveTo: p.effectiveTo ? new Date(p.effectiveTo) : null,
        })),
      });
      return created;
    });
  }

  /**
   * 获取指定 tier 的有效折扣乘数（1 - discountPercent/100）
   * 用于 SalesOrdersService.getUnitPrice
   * Updated: 2026-03-17T14:32:00
   */
  async getTierDiscountMultiplier(
    tenantId: string,
    tier: CustomerTier,
    atDate?: Date,
  ): Promise<number | null> {
    const now = atDate ?? new Date();
    const policy = await this.prisma.tierDiscountPolicy.findFirst({
      where: {
        tenantId,
        tier,
        isActive: true,
        AND: [
          { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }] },
          { OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }] },
        ],
      },
    });
    if (!policy) return null;
    const pct = Number(policy.discountPercent);
    return 1 - pct / 100;
  }
}
