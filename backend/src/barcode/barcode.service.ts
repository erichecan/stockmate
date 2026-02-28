// Updated: 2026-02-28T10:00:00
import { Injectable } from '@nestjs/common';
import bwipjs from 'bwip-js';

@Injectable()
export class BarcodeService {
  async generateCode128(text: string): Promise<Buffer> {
    return bwipjs.toBuffer({
      bcid: 'code128',
      text,
    });
  }

  async generateQR(text: string): Promise<Buffer> {
    return bwipjs.toBuffer({
      bcid: 'qrcode',
      text,
    });
  }

  async generateCode128DataUrl(text: string): Promise<string> {
    const buffer = await this.generateCode128(text);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  }

  async generateQRDataUrl(text: string): Promise<string> {
    const buffer = await this.generateQR(text);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  }
}
