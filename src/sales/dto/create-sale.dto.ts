/**
 * @description Represents one product line on a receipt.
 *
 * Examples:
 *   { productId: 1, quantity: 3 }      → 3 Coca-Cola (Adet)
 *   { productId: 2, quantity: 0.750 }  → 750g Beyaz Peynir (KG)
 */
export class SaleItemDto {
  /** The product being sold */
  productId: number;

  /**
   * How many units sold.
   * For Adet: whole number (3, 5, 12)
   * For KG: decimal (0.750, 1.200, 2.500)
   */
  quantity: number;
}

/**
 * @description DTO for creating a complete sale (receipt).
 *
 * BUSINESS FLOW:
 *   1. Cashier scans each product → adds to items[]
 *   2. Cashier submits → this DTO is sent to the API
 *   3. API calculates total price from current product prices
 *   4. API deducts stock for each item
 *   5. API creates the transaction + all items together
 *
 * NOTE: totalPrice is NOT sent by the client — the server
 * calculates it from product prices. This prevents price fraud.
 *
 * Example body:
 * {
 *   "userId": 1,
 *   "items": [
 *     { "productId": 1, "quantity": 3 },
 *     { "productId": 3, "quantity": 2 },
 *     { "productId": 2, "quantity": 0.750 }
 *   ]
 * }
 */
export class CreateSaleDto {
  /** The cashier who is processing this sale */
  userId: number;

  /** The list of products being sold (minimum 1 item) */
  items: SaleItemDto[];
}
