// Updated: 2026-03-17T12:00:00 - 后端第三部分：现金账 API
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CashbookService } from './cashbook.service';
import { OpenSessionDto } from './dto/open-session.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CloseSessionDto } from './dto/close-session.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Cashbook')
@ApiBearerAuth()
@Controller('cashbook')
export class CashbookController {
  constructor(private cashbookService: CashbookService) {}

  @Post('sessions/open')
  @ApiOperation({ summary: '开柜' })
  @ApiResponse({ status: 201, description: 'Session opened' })
  async openSession(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') operatorId: string,
    @Body() dto?: OpenSessionDto,
  ) {
    return this.cashbookService.openSession(tenantId, operatorId, dto);
  }

  @Post('transactions')
  @ApiOperation({ summary: '入账（收入/支出）' })
  @ApiResponse({ status: 201, description: 'Transaction created' })
  async createTransaction(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') operatorId: string,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.cashbookService.createTransaction(tenantId, operatorId, dto);
  }

  @Post('sessions/:id/close')
  @ApiOperation({ summary: '关柜' })
  @ApiResponse({ status: 200, description: 'Session closed' })
  async closeSession(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') operatorId: string,
    @Body() dto?: CloseSessionDto,
  ) {
    return this.cashbookService.closeSession(tenantId, operatorId, id, dto);
  }

  @Get('ledger/daily')
  @ApiOperation({ summary: '日流水' })
  @ApiQuery({ name: 'date', required: true, description: 'YYYY-MM-DD' })
  @ApiResponse({ status: 200, description: 'Daily ledger' })
  async getLedgerDaily(
    @CurrentUser('tenantId') tenantId: string,
    @Query('date') date: string,
  ) {
    if (!date) {
      return this.cashbookService.getLedgerDaily(
        tenantId,
        new Date().toISOString().slice(0, 10),
      );
    }
    return this.cashbookService.getLedgerDaily(tenantId, date);
  }
}
