import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/**
 * @interface CompetitorPriceResult
 * @description The data structure returned by the price-fetching function.
 * In production this would come from a real API or web scraper.
 */
interface CompetitorPriceResult {
  competitorName: string;
  price: number;
}

/**
 * @class AiPriceAgentService
 * @description Automated agent that fetches competitor prices and updates
 * the product_price_comparison table for all shops.
 *
 * HOW IT WORKS:
 *   1. A @Cron job fires every night at midnight
 *   2. It fetches all active shops
 *   3. For each shop, it fetches all products
 *   4. For each product, it calls fetchCompetitorPrices()
 *   5. Results are upserted into product_price_comparison
 *
 * CURRENT STATE: fetchCompetitorPrices() returns MOCK data.
 * In Phase 5 production, replace it with a real API call to:
 *   - A price comparison service (e.g. Prisync, Tsoft)
 *   - Your own web scraper microservice
 *   - An LLM agent that browses BIM/A101/SOK websites
 *
 * WHY @Logger?
 * The agent runs silently at midnight. Logger records what happened
 * so the developer can check: "Did the agent run? Did it find prices?"
 */
@Injectable()
export class AiPriceAgentService {
  private readonly logger = new Logger(AiPriceAgentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * @function runPriceUpdate
   * @description Scheduled cron job — runs every day at midnight (00:00).
   * Fetches competitor prices for ALL products in ALL active shops
   * and updates the price_comparison table.
   *
   * To trigger manually (for testing), call POST /ai-price-agent/trigger
   *
   * Cron expression: '0 0 * * *' = At 00:00 every day
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runPriceUpdate(): Promise<void> {
    this.logger.log('AI Price Agent started — fetching competitor prices...');

    try {
      // Fetch all ACTIVE shops
      const shops = await this.prisma.shop.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, shopName: true },
      });

      this.logger.log(`Found ${shops.length} active shops to process`);

      let totalUpdated = 0;

      for (const shop of shops) {
        // Fetch all products for this shop
        const products = await this.prisma.product.findMany({
          where: { shopId: shop.id },
          select: {
            id: true,
            productName: true,
            barcode: true,
            salePrice: true,
          },
        });

        this.logger.log(
          `Shop "${shop.shopName}" — processing ${products.length} products`,
        );

        for (const product of products) {
          // Fetch competitor prices (mock in dev, real API in production)
          const competitorPrices = await this.fetchCompetitorPrices(
            product.productName,
            product.barcode,
          );

          // Upsert each competitor price into the database
          for (const cp of competitorPrices) {
            await this.prisma.productPriceComparison.upsert({
              where: {
                productId_competitorName: {
                  productId: product.id,
                  competitorName: cp.competitorName,
                },
              },
              update: {
                competitorPrice: cp.price,
                lastUpdated: new Date(),
              },
              create: {
                productId: product.id,
                competitorName: cp.competitorName,
                competitorPrice: cp.price,
              },
            });
            totalUpdated++;
          }
        }
      }

      this.logger.log(
        `AI Price Agent completed — ${totalUpdated} price entries updated`,
      );
    } catch (error) {
      this.logger.error('AI Price Agent failed', error);
    }
  }

  /**
   * @function fetchCompetitorPrices
   * @description Fetches competitor prices for a single product.
   *
   * CURRENT IMPLEMENTATION: Returns mock data with realistic price variation.
   * The mock simulates BIM being ~5% cheaper and SOK being ~2% different.
   *
   * PRODUCTION IMPLEMENTATION (replace this method body):
   *   Option A — External Price API:
   *     const response = await fetch(
   *       `https://api.pricecomparison.com/products?barcode=${barcode}&country=TR`
   *     );
   *     return response.json();
   *
   *   Option B — Your own scraper microservice:
   *     const response = await fetch(
   *       `http://scraper-service:4000/scrape?name=${productName}`
   *     );
   *     return response.json();
   *
   *   Option C — LLM Agent (Claude API):
   *     Use Claude to browse BIM/A101/SOK websites and extract prices.
   *     This is the true "AI Agent" approach.
   *
   * @param {string} productName - Product name to search for.
   * @param {string|null} barcode - Product barcode (more accurate search).
   * @returns {Promise<CompetitorPriceResult[]>} Array of competitor prices.
   */
  private async fetchCompetitorPrices(
    productName: string,
    barcode: string | null,
  ): Promise<CompetitorPriceResult[]> {
    // ─────────────────────────────────────────────────────────
    // MOCK IMPLEMENTATION — Replace with real API in production
    // ─────────────────────────────────────────────────────────
    this.logger.debug(
      `Fetching prices for: ${productName} (barcode: ${barcode ?? 'none'})`,
    );

    // Simulate a small network delay (like a real API call would have)
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Generate realistic mock prices based on product name hash
    // This ensures consistent prices for the same product across runs
    const nameHash = productName
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const basePrice = 10 + (nameHash % 90); // Price between 10-100 TL

    return [
      {
        competitorName: 'BIM',
        price: Math.round(basePrice * 0.95 * 100) / 100, // BIM is ~5% cheaper
      },
      {
        competitorName: 'A101',
        price: Math.round(basePrice * 0.98 * 100) / 100, // A101 is ~2% cheaper
      },
      {
        competitorName: 'SOK',
        price: Math.round(basePrice * 1.02 * 100) / 100, // SOK is ~2% more expensive
      },
    ];
  }

  /**
   * @function triggerManually
   * @description Allows manual triggering of the price update agent.
   * Used by the /ai-price-agent/trigger endpoint for testing
   * without waiting for midnight.
   * @returns {Promise<Object>} Summary of what was updated.
   */
  async triggerManually(): Promise<{ message: string; timestamp: string }> {
    this.logger.log('Manual trigger received — running price update now...');
    await this.runPriceUpdate();
    return {
      message: 'Price update agent ran successfully',
      timestamp: new Date().toISOString(),
    };
  }
}
