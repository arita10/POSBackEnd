import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PriceUploadService } from './price-upload.service';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * Price Upload & History endpoints.
 *
 * Flow:
 *   1. POST /shops/:shopId/price-upload/parse   → upload file, get preview
 *   2. POST /shops/:shopId/price-upload/apply   → confirm and apply price changes
 *   3. GET  /shops/:shopId/price-upload/history → full price change history
 */
@Roles('OWNER', 'STAFF')
@Controller('shops/:shopId/price-upload')
export class PriceUploadController {
  constructor(private readonly priceUploadService: PriceUploadService) {}

  /**
   * Step 1 — Upload file and get a preview of parsed barcode/price rows.
   * Nothing is saved. Returns matched and unmatched rows for user review.
   * Accepts: .xlsx, .xls, .csv, .pdf, .png, .jpg, .jpeg
   */
  @Post('parse')
  @UseInterceptors(FileInterceptor('file'))
  async parseFile(
    @Param('shopId', ParseIntPipe) shopId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.priceUploadService.parseAndPreview(shopId, file);
  }

  /**
   * Step 2 — Apply the confirmed price changes.
   * Frontend sends only the rows the user approved (matched rows).
   * Body: { rows: [{ productId: number, newPrice: number }] }
   */
  @Roles('OWNER')
  @Post('apply')
  async applyPrices(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Req() req: any,
    @Body() body: { rows: { productId: number; newPrice: number }[] },
  ) {
    const changedBy: number = req.user?.sub;
    return this.priceUploadService.applyPrices(shopId, changedBy, body.rows);
  }

  /**
   * Get the full price change history for the shop (last 200 entries).
   * Used by the history page on the frontend.
   */
  @Get('history')
  getHistory(@Param('shopId', ParseIntPipe) shopId: number) {
    return this.priceUploadService.getShopPriceHistory(shopId);
  }
}
