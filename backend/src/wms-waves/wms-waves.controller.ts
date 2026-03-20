// Updated: 2026-03-18T23:32:10 - 正式 WMS 波次实体控制器
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PickWaveStatus, UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateWaveDto } from './dto/create-wave.dto';
import { UpdateWaveStatusDto } from './dto/update-wave-status.dto';
import { WmsWavesService } from './wms-waves.service';

@ApiTags('WMS Waves')
@ApiBearerAuth()
@Controller('wms/waves')
@UseGuards(RolesGuard)
// Updated: 2026-03-20T07:54:48-0400 - 订单处理(SALES)需只读访问波次/拣货看板；创建/改状态仍由方法级 @Roles 收紧
// Updated: 2026-03-20T18:22:10-0400 - RETURN_SPECIALIST 与 sales-orders 只读对齐，可打开拣货看板（创建/改状态仍受限）
@Roles(
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.OPERATIONS,
  UserRole.SALES_SUPERVISOR,
  UserRole.SALES,
  UserRole.RETURN_SPECIALIST,
  UserRole.WAREHOUSE,
  UserRole.PICKER,
)
export class WmsWavesController {
  constructor(private readonly wmsWavesService: WmsWavesService) {}

  @Post()
  // Updated: 2026-03-19T15:13:45 - 波次创建仅仓库主管/运营/管理可操作
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.OPERATIONS,
    UserRole.WAREHOUSE,
  )
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

  @Get('picking-summary')
  // Updated: 2026-03-20T07:20:45-0400 - 必须位于 :id 之前，避免被当成 UUID
  @ApiOperation({ summary: '仓库拣货看板 KPI：待处理订单/波次/缺货行数' })
  async getPickingSummary(@CurrentUser('tenantId') tenantId: string) {
    return this.wmsWavesService.getPickingDashboardSummary(tenantId);
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
  // Updated: 2026-03-19T15:13:45 - 波次状态推进允许仓库主管与拣货员操作
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.OPERATIONS,
    UserRole.WAREHOUSE,
    UserRole.PICKER,
  )
  @ApiOperation({ summary: '更新波次状态' })
  async patchWaveStatus(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: UpdateWaveStatusDto,
  ) {
    return this.wmsWavesService.updateWaveStatus(tenantId, id, body.status);
  }
}
