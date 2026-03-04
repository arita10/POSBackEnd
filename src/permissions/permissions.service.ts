import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePermissionDto } from './dto/update-permission.dto';

/**
 * @class PermissionsService
 * @description Handles business logic for user permission management.
 *
 * TENANCY: Permissions don't have their own shopId column.
 * Instead, we verify tenancy through the User → Shop relationship.
 * Before updating a permission, we check that the user belongs
 * to the given shopId. This is "indirect tenancy".
 *
 * FLOW:
 *   1. Request comes: PUT /shops/1/users/3/permissions
 *   2. We verify User #3 belongs to Shop #1
 *   3. Only then do we update User #3's permissions
 */
@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @function findByUser
   * @description Retrieves the permission record for a specific user.
   * TENANCY: Validates that the user belongs to the given shop.
   * @param {number} shopId - The shop the user must belong to.
   * @param {number} userId - The user whose permissions to retrieve.
   * @returns {Promise<Permission>} The user's permission record.
   * @throws {NotFoundException} If user not found in this shop or no permissions exist.
   */
  async findByUser(shopId: number, userId: number) {
    // First verify the user belongs to this shop (tenancy check)
    const user = await this.prisma.user.findFirst({
      where: { id: userId, shopId },
      include: { permission: true },
    });

    if (!user) {
      throw new NotFoundException(
        `User with ID ${userId} not found in shop ${shopId}`,
      );
    }

    if (!user.permission) {
      throw new NotFoundException(
        `No permissions found for user ${userId}. This should not happen — please recreate the user.`,
      );
    }

    return user.permission;
  }

  /**
   * @function update
   * @description Updates a user's permission flags.
   * Only the shop owner should call this (enforced in Phase 2 with guards).
   * TENANCY: Validates user belongs to the given shop before updating.
   * @param {number} shopId - The shop the user must belong to.
   * @param {number} userId - The user whose permissions to update.
   * @param {UpdatePermissionDto} dto - The permission flags to update.
   * @returns {Promise<Permission>} The updated permission record.
   * @throws {NotFoundException} If user not found in this shop.
   */
  async update(shopId: number, userId: number, dto: UpdatePermissionDto) {
    const permission = await this.findByUser(shopId, userId);

    return this.prisma.permission.update({
      where: { id: permission.id },
      data: {
        ...(dto.canManageStock !== undefined && {
          canManageStock: dto.canManageStock,
        }),
        ...(dto.canViewReports !== undefined && {
          canViewReports: dto.canViewReports,
        }),
      },
    });
  }
}
