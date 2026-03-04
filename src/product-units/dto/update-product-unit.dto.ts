/**
 * @description DTO for updating an existing product unit.
 * Example: Rename "Kilogram" to "KG" for shorter display.
 */
export class UpdateProductUnitDto {
  /** Updated unit name */
  unitName?: string;
}
