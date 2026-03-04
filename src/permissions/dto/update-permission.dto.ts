/**
 * @description DTO for updating a user's permissions.
 * Only the shop owner should be able to call this.
 * All fields are optional — only send what you want to change.
 *
 * Example: To give a staff member stock management access:
 *   PUT /shops/1/users/3/permissions
 *   { "canManageStock": true }
 */
export class UpdatePermissionDto {
  /** Can this user add/edit/delete products and manage inventory? */
  canManageStock?: boolean;

  /** Can this user view sales reports and daily balance? */
  canViewReports?: boolean;
}
