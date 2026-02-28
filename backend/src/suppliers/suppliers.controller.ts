// Updated: 2026-02-28T10:00:00
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
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Suppliers')
@ApiBearerAuth()
@Controller('suppliers')
export class SuppliersController {
  constructor(private suppliersService: SuppliersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new supplier' })
  @ApiResponse({ status: 201, description: 'Supplier created' })
  @ApiResponse({ status: 409, description: 'Supplier code already exists' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateSupplierDto,
  ) {
    return this.suppliersService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List suppliers with pagination and search' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name or code' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Suppliers list returned' })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.suppliersService.findAll(tenantId, search, pageNum, limitNum);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier by ID' })
  @ApiResponse({ status: 200, description: 'Supplier returned' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.suppliersService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update supplier' })
  @ApiResponse({ status: 200, description: 'Supplier updated' })
  async update(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate supplier (soft delete)' })
  @ApiResponse({ status: 200, description: 'Supplier deactivated' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.suppliersService.remove(id, tenantId);
  }
}
