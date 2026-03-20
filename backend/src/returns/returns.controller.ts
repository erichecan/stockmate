// Updated: 2026-03-19T15:11:35 - 退货工作台 API + RBAC
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
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateReturnRecordDto } from './dto/create-return-record.dto';
import { QueryReturnRecordsDto } from './dto/query-return-records.dto';
import { UpdateReturnDecisionDto } from './dto/update-return-decision.dto';
import { ReturnsService } from './returns.service';

@ApiTags('Returns Workbench')
@ApiBearerAuth()
@Controller('returns')
@UseGuards(RolesGuard)
@Roles(
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.OPERATIONS,
  UserRole.SALES_SUPERVISOR,
  UserRole.RETURN_SPECIALIST,
)
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post()
  @ApiOperation({ summary: '登记退回件（可先登记后匹配订单/SKU）' })
  @ApiResponse({ status: 201, description: 'Return record created' })
  async createReturnRecord(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') operatorUserId: string,
    @Body() dto: CreateReturnRecordDto,
  ) {
    return this.returnsService.createReturnRecord(tenantId, operatorUserId, dto);
  }

  @Get()
  @ApiOperation({ summary: '查询退货记录列表' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'disposition', required: false })
  @ApiQuery({ name: 'orderNumber', required: false })
  @ApiQuery({ name: 'skuCode', required: false })
  @ApiQuery({ name: 'keyword', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async queryReturnRecords(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: QueryReturnRecordsDto,
  ) {
    return this.returnsService.queryReturnRecords(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询退货记录详情' })
  async getReturnRecordById(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.returnsService.getReturnRecordById(tenantId, id);
  }

  @Patch(':id/decision')
  @ApiOperation({ summary: '退货处置决策：弃货/维修/降价销售/零售' })
  async updateReturnDecision(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') operatorUserId: string,
    @Param('id') id: string,
    @Body() dto: UpdateReturnDecisionDto,
  ) {
    return this.returnsService.updateReturnDecision(
      tenantId,
      operatorUserId,
      id,
      dto,
    );
  }
}
