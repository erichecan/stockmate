// 打印方案 Controller；参考 ModernWMS PrintSolutionController，出库单/入库单/拣货单模板
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
import { PrintDocumentType } from '@prisma/client';
import { PrintSolutionService } from './print-solution.service';
import { CreatePrintSolutionDto } from './dto/create-print-solution.dto';
import { UpdatePrintSolutionDto } from './dto/update-print-solution.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Print Solution (打印方案)')
@ApiBearerAuth()
@Controller('print-solutions')
export class PrintSolutionController {
  constructor(private printSolutionService: PrintSolutionService) {}

  @Post()
  @ApiOperation({ summary: '创建打印方案' })
  @ApiResponse({ status: 201, description: '创建成功' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreatePrintSolutionDto,
  ) {
    return this.printSolutionService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: '打印方案列表（分页）' })
  @ApiQuery({ name: 'documentType', required: false, enum: PrintDocumentType })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: '列表' })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('documentType') documentType?: PrintDocumentType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.printSolutionService.findAll(
      tenantId,
      documentType,
      pageNum,
      limitNum,
    );
  }

  @Get('by-type/:documentType')
  @ApiOperation({ summary: '按单据类型获取方案（出库单/入库单/拣货单）' })
  @ApiResponse({ status: 200, description: '该类型下所有方案' })
  async findByDocumentType(
    @CurrentUser('tenantId') tenantId: string,
    @Param('documentType') documentType: PrintDocumentType,
  ) {
    return this.printSolutionService.findByDocumentType(tenantId, documentType);
  }

  @Get(':id')
  @ApiOperation({ summary: '打印方案详情' })
  @ApiResponse({ status: 200, description: '详情' })
  @ApiResponse({ status: 404, description: '不存在' })
  async findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.printSolutionService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新打印方案' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePrintSolutionDto,
  ) {
    return this.printSolutionService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除打印方案' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async remove(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.printSolutionService.remove(id, tenantId);
  }
}
