import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { UpdatePermissionDto } from './dto/update-permission.dto';

/**
 * @controller PermissionsController
 * @description Handles HTTP requests for user permission management.
 * Base route: /shops/:shopId/users/:userId/permissions
 *
 * WHY nested this deep?
 * Permissions belong to a User, who belongs to a Shop.
 * The URL expresses: "In Shop X, for User Y, manage their permissions."
 *
 * Endpoints:
 *   GET /shops/:shopId/users/:userId/permissions  → View user's permissions
 *   PUT /shops/:shopId/users/:userId/permissions  → Update user's permissions
 */
@Controller('shops/:shopId/users/:userId/permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  /**
   * @route GET /shops/:shopId/users/:userId/permissions
   * @description Get the permission flags for a specific user.
   * @param {number} shopId - The shop ID from the URL.
   * @param {number} userId - The user ID from the URL.
   */
  @Get()
  findByUser(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.permissionsService.findByUser(shopId, userId);
  }

  /**
   * @route PUT /shops/:shopId/users/:userId/permissions
   * @description Update permission flags for a specific user.
   * @param {number} shopId - The shop ID from the URL.
   * @param {number} userId - The user ID from the URL.
   * @body {UpdatePermissionDto} dto - { canManageStock?, canViewReports? }
   */
  @Put()
  update(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdatePermissionDto,
  ) {
    return this.permissionsService.update(shopId, userId, dto);
  }
}
