// Updated: 2026-02-27T04:30:00
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Brands')
@ApiBearerAuth()
@Controller('brands')
export class BrandsController {
  constructor(private brandsService: BrandsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new brand' })
  @ApiResponse({ status: 201, description: 'Brand created' })
  @ApiResponse({ status: 409, description: 'Brand code already exists' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateBrandDto,
  ) {
    return this.brandsService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all brands' })
  @ApiResponse({ status: 200, description: 'Brands list returned' })
  async findAll(@CurrentUser('tenantId') tenantId: string) {
    return this.brandsService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get brand by ID' })
  @ApiResponse({ status: 200, description: 'Brand returned' })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.brandsService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update brand' })
  @ApiResponse({ status: 200, description: 'Brand updated' })
  async update(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: UpdateBrandDto,
  ) {
    return this.brandsService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate brand (soft delete)' })
  @ApiResponse({ status: 200, description: 'Brand deactivated' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.brandsService.remove(id, tenantId);
  }
}
