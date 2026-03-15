// 库存冻结单 API
// Updated: 2026-03-14
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { StockFreezeService } from './stock-freeze.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateStockFreezeDto } from './dto/create-stock-freeze.dto';
import { StockFreezeQueryDto } from './dto/stock-freeze-query.dto';

@ApiTags('StockFreeze')
@ApiBearerAuth()
@Controller('stock-freeze')
export class StockFreezeController {
  constructor(private stockFreezeService: StockFreezeService) {}

  @Post()
  @ApiOperation({ summary: '创建库存冻结单（扣减可用并写入冻结记录）' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 400, description: '可用库存不足' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateStockFreezeDto,
  ) {
    return this.stockFreezeService.create(tenantId, userId, dto);
  }

  @Post(':id/release')
  @ApiOperation({ summary: '解冻（将冻结单置为已解冻并释放 lockedQty）' })
  @ApiResponse({ status: 200, description: '解冻成功' })
  @ApiResponse({ status: 400, description: '冻结单不存在或已解冻' })
  async release(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.stockFreezeService.release(tenantId, userId, id);
  }

  @Get()
  @ApiOperation({ summary: '分页列表，支持 status/skuId/warehouseId 筛选' })
  @ApiResponse({ status: 200, description: '分页数据' })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: StockFreezeQueryDto,
  ) {
    return this.stockFreezeService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单条冻结单' })
  @ApiResponse({ status: 200, description: '冻结单详情' })
  @ApiResponse({ status: 400, description: '不存在' })
  async findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.stockFreezeService.findOne(tenantId, id);
  }
}
