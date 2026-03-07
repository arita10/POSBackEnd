/**
 * @description DTO for updating an existing product.
 * All fields are optional — only send what you want to change.
 *
 * Example: Update the price of Coca-Cola:
 *   PUT /shops/1/products/1
 *   { "salePrice": 27.00 }
 */
export class UpdateProductDto {
  /** Change the measurement unit */
  unitId?: number;

  /** Update the barcode */
  barcode?: string;

  /** Update the product name */
  productName?: string;

  /** Update the purchase/cost price */
  costPrice?: number;

  /** Update the selling price */
  salePrice?: number;

  /** Manually adjust stock quantity (for inventory corrections) */
  stockQuantity?: number;

  /** Optional expiry date (ISO date string YYYY-MM-DD) */
  expiryDate?: string;
}
