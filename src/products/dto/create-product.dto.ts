/**
 * @description DTO for creating a new product in the inventory.
 *
 * Example: Adding Coca-Cola (Adet) to the shop:
 *   {
 *     unitId: 1,            ← ID of "Adet" unit
 *     barcode: "8690000001",
 *     productName: "Coca-Cola 330ml",
 *     salePrice: 25.50,
 *     stockQuantity: 48     ← 48 bottles
 *   }
 *
 * Example: Adding White Cheese (KG) to the shop:
 *   {
 *     unitId: 2,            ← ID of "KG" unit
 *     productName: "Beyaz Peynir",
 *     salePrice: 180.00,    ← Price per KG
 *     stockQuantity: 5.500  ← 5.5 kilograms in stock
 *   }
 */
export class CreateProductDto {
  /** The measurement unit ID (Adet, KG, etc.) */
  unitId: number;

  /** Product barcode (optional, scanned from packaging) */
  barcode?: string;

  /** Display name of the product */
  productName: string;

  /** Purchase/cost price in TL (what the shop paid to buy this product) */
  costPrice?: number;

  /** Selling price in TL. For KG items, this is price PER KG */
  salePrice: number;

  /** Initial stock quantity. Use decimals for KG (e.g. 5.500) */
  stockQuantity?: number;
}
