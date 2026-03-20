// Updated: 2026-03-20T10:36:18 - 老板经营分析 API（经营总览增强）
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminAnalyticsService } from './admin-analytics.service';

@ApiTags('Admin Analytics')
@ApiBearerAuth()
@Controller('admin/analytics')
@UseGuards(RolesGuard)
@Roles(
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.OPERATIONS,
  UserRole.SALES_SUPERVISOR,
  UserRole.FINANCE,
)
export class AdminAnalyticsController {
  constructor(private readonly service: AdminAnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: '老板经营总览（金额、走势、TOP榜单）' })
  @ApiQuery({
    name: 'month',
    required: false,
    description: '月份，格式 YYYY-MM；为空默认当前月',
  })
  async getOverview(
    @CurrentUser('tenantId') tenantId: string,
    @Query('month') month?: string,
  ) {
    return this.service.getOverview(tenantId, month);
  }
}

