import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');
import Tesseract from 'tesseract.js';
import { Decimal } from '@prisma/client/runtime/library';

export interface ParsedPriceRow {
  barcode: string;
  newPrice: number;
  productName?: string; // resolved from DB after match
  oldPrice?: number;    // current price from DB
  productId?: number;
  matched: boolean;
}

@Injectable()
export class PriceUploadService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Parse uploaded file (Excel / PDF / Image) and extract barcode→price rows.
   * Returns a preview list — nothing is saved yet.
   */
  async parseAndPreview(
    shopId: number,
    file: Express.Multer.File,
  ): Promise<ParsedPriceRow[]> {
    const ext = file.originalname.split('.').pop()?.toLowerCase();

    let rows: { barcode: string; newPrice: number }[] = [];

    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
      rows = this.parseExcel(file.buffer);
    } else if (ext === 'pdf') {
      rows = await this.parsePdf(file.buffer);
    } else if (['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(ext ?? '')) {
      rows = await this.parseImage(file.buffer);
    } else {
      throw new BadRequestException(
        'Desteklenmeyen dosya tipi. Excel (.xlsx/.xls/.csv), PDF veya resim (PNG/JPG) yükleyin.',
      );
    }

    if (rows.length === 0) {
      throw new BadRequestException(
        'Dosyadan barkod/fiyat verisi çıkarılamadı. Lütfen dosya formatını kontrol edin.',
      );
    }

    return this.matchWithDb(shopId, rows);
  }

  /**
   * Apply approved price changes.
   * Only applies rows where matched=true and newPrice differs from oldPrice.
   */
  async applyPrices(
    shopId: number,
    changedBy: number,
    rows: { productId: number; newPrice: number }[],
  ): Promise<{ updated: number; skipped: number }> {
    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      const product = await this.prisma.product.findFirst({
        where: { id: row.productId, shopId },
      });

      if (!product) { skipped++; continue; }

      const oldPrice = new Decimal(product.salePrice.toString());
      const newPrice = new Decimal(row.newPrice.toString());

      if (oldPrice.equals(newPrice)) { skipped++; continue; }

      await this.prisma.product.update({
        where: { id: row.productId },
        data: { salePrice: newPrice },
      });

      await this.prisma.productPriceHistory.create({
        data: {
          productId: row.productId,
          shopId,
          oldPrice,
          newPrice,
          changedBy,
        },
      });

      updated++;
    }

    return { updated, skipped };
  }

  /**
   * Get price history for all products in a shop (for history page).
   */
  async getShopPriceHistory(shopId: number) {
    const rows = await this.prisma.productPriceHistory.findMany({
      where: { shopId },
      include: {
        product: { select: { productName: true, barcode: true } },
        user:    { select: { username: true } },
      },
      orderBy: { changedAt: 'desc' },
      take: 200,
    });

    return rows.map((r) => ({
      id:          r.id,
      productId:   r.productId,
      productName: r.product.productName,
      barcode:     r.product.barcode,
      oldPrice:    r.oldPrice.toString(),
      newPrice:    r.newPrice.toString(),
      changedBy:   r.user?.username ?? 'sistem',
      changedAt:   r.changedAt.toISOString(),
    }));
  }

  // ── PRIVATE PARSERS ───────────────────────────────────────────

  /**
   * Parse Excel/CSV buffer.
   * Expects columns: barcode | price  (header row required)
   * Also accepts: barkod | fiyat (Turkish headers)
   */
  private parseExcel(buffer: Buffer): { barcode: string; newPrice: number }[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const results: { barcode: string; newPrice: number }[] = [];

    for (const row of json) {
      const keys = Object.keys(row).map((k) => k.toLowerCase().trim());
      const barcodeKey = Object.keys(row).find((k) =>
        ['barcode', 'barkod', 'bar_code', 'upc', 'ean', 'kod', 'code'].includes(k.toLowerCase().trim()),
      );
      const priceKey = Object.keys(row).find((k) =>
        [
          'price', 'fiyat', 'sale_price', 'satis_fiyati', 'new_price', 'yeni_fiyat',
          'yeni liste fiyat', 'yeni tavsiye raf fiyat', 'liste fiyat', 'tavsiye raf fiyat',
          'yeni liste fiyatı', 'yeni tavsiye raf fiyatı', 'liste fiyatı', 'tavsiye raf fiyatı',
        ].includes(k.toLowerCase().trim()),
      );

      if (!barcodeKey || !priceKey) continue;

      const barcode = String(row[barcodeKey]).trim();
      const price   = parseFloat(String(row[priceKey]).replace(',', '.'));

      if (barcode && !isNaN(price) && price > 0) {
        results.push({ barcode, newPrice: price });
      }
    }

    return results;
  }

  /**
   * Parse PDF text and extract barcode/price pairs.
   * Looks for lines like: "8690000123456  12.50"
   */
  private async parsePdf(buffer: Buffer): Promise<{ barcode: string; newPrice: number }[]> {
    const data = await pdfParse(buffer);
    return this.extractFromText(data.text);
  }

  /**
   * Parse image using OCR (Tesseract) and extract barcode/price pairs.
   */
  private async parseImage(buffer: Buffer): Promise<{ barcode: string; newPrice: number }[]> {
    const { data: { text } } = await Tesseract.recognize(buffer, 'tur+eng');
    return this.extractFromText(text);
  }

  /**
   * Extract barcode/price pairs from raw text.
   * Pattern: a long number (8-14 digits = barcode) followed by a decimal price.
   */
  private extractFromText(text: string): { barcode: string; newPrice: number }[] {
    const results: { barcode: string; newPrice: number }[] = [];
    // Match: <barcode 8-14 digits>  <whitespace or separator>  <price digits.digits>
    const pattern = /(\d{8,14})\s*[|\t ;,-]?\s*(\d+[.,]\d{1,2})/g;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const barcode  = match[1].trim();
      const price    = parseFloat(match[2].replace(',', '.'));
      if (price > 0) {
        results.push({ barcode, newPrice: price });
      }
    }

    return results;
  }

  /**
   * Match parsed barcode/price rows against the shop's products in DB.
   */
  private async matchWithDb(
    shopId: number,
    rows: { barcode: string; newPrice: number }[],
  ): Promise<ParsedPriceRow[]> {
    const barcodes = rows.map((r) => r.barcode);

    const products = await this.prisma.product.findMany({
      where: { shopId, barcode: { in: barcodes } },
      select: { id: true, barcode: true, productName: true, salePrice: true },
    });

    const productMap = new Map(products.map((p) => [p.barcode!, p]));

    return rows.map((row) => {
      const product = productMap.get(row.barcode);
      if (!product) {
        return { barcode: row.barcode, newPrice: row.newPrice, matched: false };
      }
      return {
        barcode:     row.barcode,
        newPrice:    row.newPrice,
        productName: product.productName,
        oldPrice:    parseFloat(product.salePrice.toString()),
        productId:   product.id,
        matched:     true,
      };
    });
  }
}
