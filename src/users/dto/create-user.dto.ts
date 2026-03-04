import { UserRole } from '@prisma/client';

/**
 * @description DTO for creating a new user within a shop.
 *
 * TENANCY NOTE: The shopId comes from the URL parameter (/shops/:shopId/users),
 * NOT from the request body. This prevents a malicious user from sending
 * a different shopId in the body to create users in another shop.
 */
export class CreateUserDto {
  /** Login username, must be unique within the shop */
  username: string;

  /** Plain text password (will be hashed in Phase 2 with bcrypt) */
  password: string;

  /** User role: OWNER or STAFF. Defaults to STAFF if not provided */
  role?: UserRole;
}
