/**
 * @description DTO for adjusting a product's stock quantity.
 *
 * This is separate from UpdateProductDto because stock adjustments
 * are a specific business operation with different rules:
 *   - "add" increases stock (new delivery arrived)
 *   - "remove" decreases stock (damaged goods, manual correction)
 *
 * WHY not just update stockQuantity directly?
 * Because in a real bakkal, two people might adjust stock at the same time.
 * Using add/remove with atomic operations prevents race conditions.
 *
 * Example: New delivery of 24 Coca-Cola bottles:
 *   POST /shops/1/products/1/adjust-stock
 *   { "type": "add", "quantity": 24 }
 *
 * Example: 2 bottles of Coca-Cola damaged:
 *   POST /shops/1/products/1/adjust-stock
 *   { "type": "remove", "quantity": 2 }
 *
 * Example: Received 3.500 KG of cheese:
 *   POST /shops/1/products/5/adjust-stock
 *   { "type": "add", "quantity": 3.500 }
 */
export class AdjustStockDto {
  /** "add" to increase stock, "remove" to decrease stock */
  type: 'add' | 'remove';

  /** The quantity to add or remove (always positive number) */
  quantity: number;
}
