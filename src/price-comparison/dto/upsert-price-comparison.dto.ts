/**
 * @description DTO for creating or updating a competitor price comparison.
 *
 * UPSERT means: "Create if it doesn't exist, Update if it does."
 * This is perfect for the AI agent which runs periodically:
 *   - First time: Creates A101's price for Coca-Cola
 *   - Next time: Updates A101's price if it changed
 *
 * Example:
 *   POST /shops/1/products/1/price-comparisons
 *   {
 *     "competitorName": "A101",
 *     "competitorPrice": 24.90
 *   }
 */
export class UpsertPriceComparisonDto {
  /** The competitor's name (e.g. "A101", "BIM", "SOK", "Migros") */
  competitorName: string;

  /** The competitor's price for this product in TL */
  competitorPrice: number;
}
