/**
 * @description DTO for user login.
 *
 * Example:
 * {
 *   "shopId": 1,
 *   "username": "ali",
 *   "password": "123456"
 * }
 */
export class LoginDto {
  /** The shop this user belongs to */
  shopId: number;

  /** Username (unique within the shop) */
  username: string;

  /** Plain-text password (compared against bcrypt hash in DB) */
  password: string;
}
