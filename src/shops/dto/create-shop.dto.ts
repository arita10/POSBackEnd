/**
 * @description DTO for creating a new shop (tenant).
 * When a bakkal owner signs up, they send this data.
 * The 'status' defaults to ACTIVE in the database, so it's not needed here.
 */
export class CreateShopDto {
  /** The display name of the bakkal, e.g. "Ali'nin Bakkalı" */
  shopName: string;
}
