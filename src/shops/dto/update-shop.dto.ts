import { ShopStatus } from '@prisma/client';

/**
 * @description DTO for updating an existing shop.
 * All fields are optional — only send what you want to change.
 * Example: To expire a shop's subscription, send { status: "EXPIRED" }
 */
export class UpdateShopDto {
  /** Updated shop name */
  shopName?: string;

  /** Change subscription status: ACTIVE or EXPIRED */
  status?: ShopStatus;
}
