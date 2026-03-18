// Updated: 2026-03-17T14:30:00 - 批发再来一单：candidates、merge-draft
import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { WholesaleOrdersService } from './wholesale-orders.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MergeDraftDto } from './dto/wholesale-orders.dto';

@ApiTags('Wholesale Reorder')
@ApiBearerAuth()
@Controller('wholesale/reorder')
export class WholesaleReorderController {
  constructor(
    private readonly wholesaleOrdersService: WholesaleOrdersService,
  ) {}

  @Get('candidates')
  @ApiOperation({
    summary: '获取当前客户最近 N 单（排除 DRAFT），用于「再来一单」候选',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '默认 5',
  })
  async getCandidates(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('customerId') customerId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 5;
    return this.wholesaleOrdersService.getReorderCandidates(
      tenantId,
      customerId,
      limitNum,
    );
  }

  @Post('merge-draft')
  @ApiOperation({
    summary: '合并多单行项目生成 DRAFT 订单（同 SKU 合并数量）',
  })
  async mergeDraft(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('customerId') customerId: string,
    @Body() body: MergeDraftDto,
  ) {
    return this.wholesaleOrdersService.mergeDraft(
      tenantId,
      customerId,
      body.orderIds,
    );
  }
}
