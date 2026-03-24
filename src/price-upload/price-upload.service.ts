import {
  Injectable,
  BadRequestException,
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
      const normalize = (k: string) => k.toLowerCase().replace(/[\s\n\r_]+/g, ' ').trim();
      const barcodeKey = Object.keys(row).find((k) =>
        ['barcode', 'barkod', 'bar code', 'upc', 'ean', 'kod', 'code'].includes(normalize(k)),
      );

      // Priority order: prefer "yeni tavsiye raf fiyatı" (col K) over earlier columns.
      // Use findLast so if multiple columns match, we pick the rightmost (last) one.
      const pricePreference = [
        'yeni tavsiye raf fiyatı', 'yeni tavsiye raf fiyat',
        'yeni liste fiyatı', 'yeni liste fiyat',
        'tavsiye raf fiyatı', 'tavsiye raf fiyat',
        'liste fiyatı', 'liste fiyat',
        'new price', 'yeni fiyat',
        'price', 'fiyat', 'sale price', 'satis fiyati',
      ];
      const allKeys = Object.keys(row);
      // Find by priority: first try each preferred name in order
      let priceKey: string | undefined;
      for (const pref of pricePreference) {
        priceKey = allKeys.find((k) => normalize(k) === pref);
        if (priceKey) break;
      }

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
   * Parse image using Tesseract OCR.
   * Runs OCR in Turkish+English then applies both ETI card pattern
   * and generic barcode/price fallback.
   */
  private async parseImage(buffer: Buffer): Promise<{ barcode: string; newPrice: number }[]> {
    const { data: { text } } = await Tesseract.recognize(buffer, 'tur+eng', {
      logger: () => {},
    });
    return this.extractFromText(text);
  }

  /**
   * Extract barcode/price pairs from raw text.
   *
   * Strategy 1 — ETI/vendor card format:
   *   Looks for "Ürün Barkodu <barcode>" followed later by
   *   "Öneri Satış Fiyat <price>" or "Öneri Satış Fiyatı <price>"
   *
   * Strategy 2 — generic fallback:
   *   Barcode (8-14 digits) directly followed by a decimal price on the same line.
   */
  private extractFromText(text: string): { barcode: string; newPrice: number }[] {
    const results: { barcode: string; newPrice: number }[] = [];
    const seen = new Set<string>();

    const addRow = (barcode: string, price: number) => {
      if (barcode && price > 0 && !seen.has(barcode)) {
        seen.add(barcode);
        results.push({ barcode, newPrice: price });
      }
    };

    // Strategy 1: ETI-style card blocks
    // Each block contains "Ürün Barkodu\n<barcode>" and "Öneri Satış Fiyat\n<price>"
    const barcodeMatches = [...text.matchAll(/[UÜ]r[uü]n\s+Barkodu\s*[:\n\r]+\s*(\d{8,14})/gi)];
    const priceMatches   = [...text.matchAll(/[OÖ]neri\s+Sat[iı][sş]\s+Fiyat[iı]?\s*[:\n\r]+\s*(\d+[.,]\d{1,2})/gi)];

    if (barcodeMatches.length > 0 && priceMatches.length > 0) {
      // Pair each barcode match with the nearest price match that comes after it
      for (const bm of barcodeMatches) {
        const bmIdx = bm.index ?? 0;
        // find closest price match after this barcode
        const pm = priceMatches.find((p) => (p.index ?? 0) > bmIdx);
        if (pm) {
          addRow(bm[1].trim(), parseFloat(pm[1].replace(',', '.')));
        }
      }
      if (results.length > 0) return results;
    }

    // Strategy 2: generic — barcode + price on same/adjacent line
    const pattern = /(\d{8,14})\s*[|\t ;,-]?\s*(\d+[.,]\d{1,2})/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      addRow(match[1].trim(), parseFloat(match[2].replace(',', '.')));
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
