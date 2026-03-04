import { Controller, Post, Get, Param, ParseIntPipe } from '@nestjs/common';
import { AiPriceAgentService } from './ai-price-agent.service';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * @controller AiPriceAgentController
 * @description Handles HTTP requests for the AI price agent.
 *
 * Endpoints:
 *   POST /ai-price-agent/trigger                  → Manually run the agent now
 *   GET  /ai-price-agent/report/:shopId           → Price intelligence report for a shop
 */
@Controller('ai-price-agent')
export class AiPriceAgentController {
  constructor(
    private readonly aiPriceAgentService: AiPriceAgentService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * @route POST /ai-price-agent/trigger
   * @description Manually triggers the price update agent immediately.
   * In production this runs automatically at midnight.
   * Use this endpoint for testing or to force an immediate update.
   */
  @Post('trigger')
  trigger() {
    return this.aiPriceAgentService.triggerManually();
  }

  /**
   * @route GET /ai-price-agent/report/:shopId
   * @description Generates a price intelligence report for a shop.
   * Shows each product, the shop's price, and all competitor prices.
   * Highlights products where the shop is MORE EXPENSIVE than competitors.
   *
   * TENANCY: shopId scopes the report to one shop only.
   *
   * EXAMPLE OUTPUT:
   * [
   *   {
   *     productName: "Coca-Cola 330ml",
   *     ourPrice: 25.50,
   *     competitors: [
   *       { name: "BIM", price: 23.50, cheaper: true, difference: -2.00 },
   *       { name: "A101", price: 24.90, cheaper: true, difference: -0.60 },
   *       { name: "SOK", price: 25.00, cheaper: true, difference: -0.50 }
   *     ],
   *     cheapestCompetitor: "BIM",
   *     maxSavingOpportunity: -2.00
   *   }
   * ]
   *
   * @param {number} shopId - The shop to generate the report for.
   */
  @Get('report/:shopId')
  async getPriceReport(@Param('shopId', ParseIntPipe) shopId: number) {
    // Fetch all products with their competitor prices for this shop
    const products = await this.prisma.product.findMany({
      where: { shopId },
      include: {
        unit: { select: { unitName: true } },
        priceComparisons: {
          orderBy: { competitorPrice: 'asc' },
        },
      },
      orderBy: { productName: 'asc' },
    });

    // Build the price intelligence report
    return products.map((product) => {
      const ourPrice = new Decimal(product.salePrice.toString());

      const competitors = product.priceComparisons.map((comp) => {
        const compPrice = new Decimal(comp.competitorPrice.toString());
        const diff = compPrice.minus(ourPrice); // negative = they are cheaper

        return {
          name: comp.competitorName,
          price: compPrice,
          cheaper: compPrice.lessThan(ourPrice),
          difference: diff, // negative means competitor is cheaper
          lastUpdated: comp.lastUpdated,
        };
      });

      // Find cheapest competitor
      const cheapestComp = competitors.reduce(
        (min, c) =>
          !min || new Decimal(c.price).lessThan(new Decimal(min.price))
            ? c
            : min,
        null as (typeof competitors)[0] | null,
      );

      const cheaperCompetitorCount = competitors.filter((c) => c.cheaper).length;

      return {
        productId: product.id,
        productName: product.productName,
        unit: product.unit.unitName,
        ourPrice,
        stockQuantity: product.stockQuantity,
        competitors,
        cheapestCompetitor: cheapestComp?.name ?? null,
        cheapestCompetitorPrice: cheapestComp?.price ?? null,
        cheaperCompetitorCount,
        // How much more expensive are we than the cheapest competitor?
        pricingStatus:
          cheaperCompetitorCount === 0
            ? 'COMPETITIVE'
            : cheaperCompetitorCount === competitors.length
              ? 'EXPENSIVE'
              : 'MIXED',
      };
    });
  }
}
