import { UserRole } from '@prisma/client';

/**
 * @description DTO for updating an existing user.
 * All fields are optional — only send what you want to change.
 */
export class UpdateUserDto {
  /** Updated username */
  username?: string;

  /** Updated password (will be hashed in Phase 2) */
  password?: string;

  /** Change role between OWNER and STAFF */
  role?: UserRole;
}
