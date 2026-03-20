// Phase 3: Sales Orders Controller
// Updated: 2026-02-28T14:20:00
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
import { SOStatus, UserRole } from '@prisma/client';
import { SalesOrdersService } from './sales-orders.service';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

/** 销售单写操作（不含退货专员只读核对） */
// Updated: 2026-03-20T07:54:48-0400
const SALES_ORDER_MUTATION_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.OPERATIONS,
  UserRole.SALES_SUPERVISOR,
  UserRole.SALES,
  UserRole.WAREHOUSE,
  UserRole.PICKER,
];

@ApiTags('Sales Orders')
@ApiBearerAuth()
@Controller('sales-orders')
@UseGuards(RolesGuard)
// Updated: 2026-03-20T07:54:48-0400 - 退货专员需读取销售单核对原单；与退货工作台 RBAC 对齐
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
export class SalesOrdersController {
  constructor(private salesOrdersService: SalesOrdersService) {}

  @Get('processing-dashboard')
  // Updated: 2026-03-20T07:27:38-0400 - 须置于 :id 之前
  @ApiOperation({ summary: '订单处理看板 KPI' })
  async getProcessingDashboard(@CurrentUser('tenantId') tenantId: string) {
    return this.salesOrdersService.getProcessingDashboardStats(tenantId);
  }

  @Post()
  @Roles(...SALES_ORDER_MUTATION_ROLES)
  @ApiOperation({ summary: 'Create a new sales order' })
  @ApiResponse({ status: 201, description: 'Sales order created' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateSalesOrderDto,
  ) {
    return this.salesOrdersService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List sales orders with pagination' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({
    name: 'statusIn',
    required: false,
    description: '逗号分隔，如 PENDING,CONFIRMED',
  })
  @ApiQuery({
    name: 'unpaidIssue',
    required: false,
    description: 'true 时仅返回未支付/账单未结订单（DRAFT 或账单 UNPAID 等）',
  })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Sales orders list returned' })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('status') status?: string,
    @Query('statusIn') statusInRaw?: string,
    @Query('unpaidIssue') unpaidIssueRaw?: string,
    @Query('customerId') customerId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // Updated: 2026-03-20T07:54:48-0400 - 防止非法 query 导致 Prisma skip 异常或非预期 400
    const rawPage = page ? parseInt(page, 10) : 1;
    const rawLimit = limit ? parseInt(limit, 10) : 20;
    const pageNum = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
    const limitNum =
      Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 100) : 20;
    const unpaidIssue = unpaidIssueRaw === 'true' || unpaidIssueRaw === '1';

    let statusIn: SOStatus[] | undefined;
    if (statusInRaw?.trim()) {
      const parts = statusInRaw.split(',').map((s) => s.trim());
      const allowed = new Set(Object.values(SOStatus));
      const parsed = parts.filter((p): p is SOStatus =>
        allowed.has(p as SOStatus),
      );
      statusIn = parsed.length ? parsed : undefined;
    }

    return this.salesOrdersService.findAll(tenantId, {
      status: status ? (status as SOStatus) : undefined,
      statusIn,
      customerId,
      page: pageNum,
      limit: limitNum,
      unpaidIssue,
    });
  }

  @Get(':id/pick-list')
  @ApiOperation({ summary: 'Get pick list for sales order' })
  @ApiResponse({ status: 200, description: 'Pick list returned' })
  async getPickList(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.salesOrdersService.getPickList(id, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sales order by ID' })
  @ApiResponse({ status: 200, description: 'Sales order returned' })
  @ApiResponse({ status: 404, description: 'Sales order not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.salesOrdersService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles(...SALES_ORDER_MUTATION_ROLES)
  @ApiOperation({ summary: 'Update sales order' })
  @ApiResponse({ status: 200, description: 'Sales order updated' })
  async update(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: UpdateSalesOrderDto,
  ) {
    return this.salesOrdersService.update(id, tenantId, dto);
  }

  @Post(':id/confirm')
  @Roles(...SALES_ORDER_MUTATION_ROLES)
  @ApiOperation({ summary: 'Confirm order and lock inventory' })
  @ApiResponse({ status: 200, description: 'Order confirmed' })
  async confirm(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.salesOrdersService.confirm(id, tenantId, userId);
  }

  @Post(':id/cancel')
  @Roles(...SALES_ORDER_MUTATION_ROLES)
  @ApiOperation({ summary: 'Cancel order and unlock inventory' })
  @ApiResponse({ status: 200, description: 'Order cancelled' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.salesOrdersService.cancel(id, tenantId, userId);
  }

  @Post(':id/fulfill')
  @Roles(...SALES_ORDER_MUTATION_ROLES)
  @ApiOperation({ summary: 'Fulfill order (outbound and complete)' })
  @ApiResponse({ status: 200, description: 'Order fulfilled' })
  async fulfill(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.salesOrdersService.fulfill(id, tenantId, userId);
  }
}
