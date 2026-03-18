// Updated: 2026-03-18T23:32:10 - 正式 WMS 波次实体控制器
import {
  Body,
  Controller,
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
import { PickWaveStatus } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateWaveDto } from './dto/create-wave.dto';
import { UpdateWaveStatusDto } from './dto/update-wave-status.dto';
import { WmsWavesService } from './wms-waves.service';

@ApiTags('WMS Waves')
@ApiBearerAuth()
@Controller('wms/waves')
export class WmsWavesController {
  constructor(private readonly wmsWavesService: WmsWavesService) {}

  @Post()
  @ApiOperation({ summary: '创建正式波次实体（从订单集合生成）' })
  @ApiResponse({ status: 201, description: 'Wave created' })
  async createWave(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateWaveDto,
  ) {
    return this.wmsWavesService.createWave(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: '分页查询波次列表' })
  @ApiQuery({ name: 'status', required: false, enum: PickWaveStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listWaves(
    @CurrentUser('tenantId') tenantId: string,
    @Query('status') status?: PickWaveStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.wmsWavesService.listWaves(tenantId, {
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: '查询波次详情' })
  async getWaveById(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.wmsWavesService.getWaveById(tenantId, id);
  }

  @Get(':id/pick-list')
  @ApiOperation({ summary: '查询波次拣货单（用于打印）' })
  async getWavePickList(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.wmsWavesService.getWavePickList(tenantId, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '更新波次状态' })
  async patchWaveStatus(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: UpdateWaveStatusDto,
  ) {
    return this.wmsWavesService.updateWaveStatus(tenantId, id, body.status);
  }
}

