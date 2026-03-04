/**
 * @description DTO for creating a new product unit (measurement type).
 *
 * Examples of unit names for a bakkal:
 *   "Adet"  — Piece (for bottles, packets, items)
 *   "KG"    — Kilogram (for cheese, olives, tomatoes)
 *   "Litre" — Liter (for milk, oil)
 *   "Paket" — Package (for cigarettes, gum packs)
 *
 * TENANCY: shopId comes from the URL (/shops/:shopId/product-units)
 */
export class CreateProductUnitDto {
  /** The unit name, e.g. "Adet", "KG", "Litre" */
  unitName: string;
}
