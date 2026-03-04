import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertPriceComparisonDto } from './dto/upsert-price-comparison.dto';

/**
 * @class PriceComparisonService
 * @description Handles business logic for competitor price comparisons.
 *
 * TENANCY: This table doesn't have its own shopId.
 * Instead, tenancy is enforced through the Product → Shop chain:
 *   1. We receive shopId + productId from the URL
 *   2. We verify the product belongs to the shop
 *   3. Only then do we access the product's price comparisons
 *
 * This is called "indirect tenancy" — the same pattern used for Permissions.
 *
 * FUTURE (Phase 5): The AI agent will call the upsert endpoint
 * automatically after scraping competitor websites.
 */
@Injectable()
export class PriceComparisonService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @function verifyProductOwnership
   * @description Ensures a product belongs to a shop before accessing its data.
   * This is the tenancy guard for price comparisons.
   * @param {number} shopId - The shop that should own the product.
   * @param {number} productId - The product to verify.
   * @throws {NotFoundException} If product not found in this shop.
   */
  private async verifyProductOwnership(shopId: number, productId: number) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, shopId },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with ID ${productId} not found in shop ${shopId}`,
      );
    }
  }

  /**
   * @function upsert
   * @description Creates or updates a competitor's price for a product.
   * Uses UPSERT: if competitor+product combo exists, update the price.
   * If not, create a new entry.
   * @param {number} shopId - The shop that owns the product.
   * @param {number} productId - The product to compare prices for.
   * @param {UpsertPriceComparisonDto} dto - { competitorName, competitorPrice }
   * @returns {Promise<ProductPriceComparison>} The created or updated record.
   */
  async upsert(
    shopId: number,
    productId: number,
    dto: UpsertPriceComparisonDto,
  ) {
    await this.verifyProductOwnership(shopId, productId);

    return this.prisma.productPriceComparison.upsert({
      where: {
        productId_competitorName: {
          productId,
          competitorName: dto.competitorName,
        },
      },
      update: {
        competitorPrice: dto.competitorPrice,
        lastUpdated: new Date(),
      },
      create: {
        productId,
        competitorName: dto.competitorName,
        competitorPrice: dto.competitorPrice,
      },
    });
  }

  /**
   * @function findByProduct
   * @description Lists all competitor prices for a specific product.
   * TENANCY: Verifies product belongs to the given shop first.
   * @param {number} shopId - The shop that owns the product.
   * @param {number} productId - The product to get comparisons for.
   * @returns {Promise<ProductPriceComparison[]>} Array of competitor prices.
   */
  async findByProduct(shopId: number, productId: number) {
    await this.verifyProductOwnership(shopId, productId);

    return this.prisma.productPriceComparison.findMany({
      where: { productId },
      orderBy: { competitorPrice: 'asc' },
    });
  }

  /**
   * @function remove
   * @description Deletes a competitor price entry.
   * @param {number} shopId - The shop that owns the product.
   * @param {number} productId - The product this comparison belongs to.
   * @param {number} comparisonId - The comparison record to delete.
   * @returns {Promise<ProductPriceComparison>} The deleted record.
   */
  async remove(shopId: number, productId: number, comparisonId: number) {
    await this.verifyProductOwnership(shopId, productId);

    const comparison = await this.prisma.productPriceComparison.findFirst({
      where: { id: comparisonId, productId },
    });

    if (!comparison) {
      throw new NotFoundException(
        `Price comparison with ID ${comparisonId} not found for product ${productId}`,
      );
    }

    return this.prisma.productPriceComparison.delete({
      where: { id: comparisonId },
    });
  }
}
