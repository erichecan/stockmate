// 货主 Controller；参考 ModernWMS GoodsownerController
// Updated: 2026-03-14
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GoodsOwnerService } from './goods-owner.service';
import { CreateGoodsOwnerDto } from './dto/create-goods-owner.dto';
import { UpdateGoodsOwnerDto } from './dto/update-goods-owner.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Goods Owner (货主)')
@ApiBearerAuth()
@Controller('goods-owners')
export class GoodsOwnerController {
  constructor(private goodsOwnerService: GoodsOwnerService) {}

  @Post()
  @ApiOperation({ summary: '创建货主' })
  @ApiResponse({ status: 201, description: '货主已创建' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateGoodsOwnerDto,
  ) {
    return this.goodsOwnerService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: '货主列表（分页）' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: '货主列表' })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.goodsOwnerService.findAll(tenantId, search, pageNum, limitNum);
  }

  @Get('all')
  @ApiOperation({ summary: '全部货主（下拉用，仅启用）' })
  @ApiResponse({ status: 200, description: '货主列表' })
  async findAllList(@CurrentUser('tenantId') tenantId: string) {
    return this.goodsOwnerService.findAllList(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: '货主详情' })
  @ApiResponse({ status: 200, description: '货主详情' })
  @ApiResponse({ status: 404, description: '货主不存在' })
  async findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.goodsOwnerService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新货主' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateGoodsOwnerDto,
  ) {
    return this.goodsOwnerService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除货主' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async remove(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.goodsOwnerService.remove(id, tenantId);
  }
}
