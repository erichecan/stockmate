// ActionLogController - 操作日志分页查询接口，阶段一底座整合
// Updated: 2026-03-14
import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ActionLogService } from './action-log.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('ActionLog')
@ApiBearerAuth()
@Controller('action-log')
export class ActionLogController {
  constructor(private actionLogService: ActionLogService) {}

  @Get()
  @ApiOperation({ summary: '分页查询操作日志' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'action', required: false })
  async list(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
  ) {
    return this.actionLogService.findPage(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      entityType,
      action,
    });
  }
}
