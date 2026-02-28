// Updated: 2026-02-28T10:00:00
import { Controller, Get, Header, Query, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BarcodeService } from './barcode.service';

@ApiTags('Barcode')
@ApiBearerAuth()
@Controller('barcode')
export class BarcodeController {
  constructor(private barcodeService: BarcodeService) {}

  @Get('code128')
  @Header('Content-Type', 'image/png')
  @ApiOperation({ summary: 'Generate Code 128 barcode as PNG' })
  @ApiQuery({ name: 'text', required: true, description: 'Text to encode' })
  @ApiResponse({ status: 200, description: 'PNG image', content: { 'image/png': {} } })
  async getCode128(@Query('text') text: string): Promise<StreamableFile> {
    const buffer = await this.barcodeService.generateCode128(text);
    return new StreamableFile(buffer);
  }

  @Get('qr')
  @Header('Content-Type', 'image/png')
  @ApiOperation({ summary: 'Generate QR code as PNG' })
  @ApiQuery({ name: 'text', required: true, description: 'Text to encode' })
  @ApiResponse({ status: 200, description: 'PNG image', content: { 'image/png': {} } })
  async getQR(@Query('text') text: string): Promise<StreamableFile> {
    const buffer = await this.barcodeService.generateQR(text);
    return new StreamableFile(buffer);
  }

  @Get('code128/dataurl')
  @ApiOperation({ summary: 'Get Code 128 barcode as base64 data URL' })
  @ApiQuery({ name: 'text', required: true, description: 'Text to encode' })
  @ApiResponse({ status: 200, description: 'Base64 data URL string' })
  async getCode128DataUrl(@Query('text') text: string): Promise<string> {
    return this.barcodeService.generateCode128DataUrl(text);
  }

  @Get('qr/dataurl')
  @ApiOperation({ summary: 'Get QR code as base64 data URL' })
  @ApiQuery({ name: 'text', required: true, description: 'Text to encode' })
  @ApiResponse({ status: 200, description: 'Base64 data URL string' })
  async getQRDataUrl(@Query('text') text: string): Promise<string> {
    return this.barcodeService.generateQRDataUrl(text);
  }
}
