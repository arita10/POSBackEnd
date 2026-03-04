/**
 * @description DTO for creating a new shop and its owner user in one request.
 * Only YOU (the SaaS seller) can call this endpoint using the ADMIN_KEY.
 *
 * Example:
 * {
 *   "shopName": "Ali'nin Bakkalı",
 *   "ownerUsername": "ali",
 *   "ownerPassword": "MyPass123"
 * }
 */
export class CreateShopWithOwnerDto {
  /** Display name of the bakkal shop */
  shopName: string;

  /** Login username for the shop owner */
  ownerUsername: string;

  /** Login password for the shop owner (will be bcrypt hashed) */
  ownerPassword: string;
}
