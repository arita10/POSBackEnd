import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateShopWithOwnerDto } from './dto/create-shop-with-owner.dto';
import { Public } from '../auth/decorators/public.decorator';

/**
 * @controller AdminController
 * @description SaaS admin endpoints — protected by ADMIN_KEY header.
 * Only YOU (the seller) can call these. Customers never get the ADMIN_KEY.
 *
 * All requests MUST include the header:
 *   x-admin-key: <value from .env ADMIN_KEY>
 *
 * Endpoints:
 *   POST /admin/shops                            → Create new shop + owner
 *   GET  /admin/shops                            → List all shops
 *   POST /admin/shops/:shopId/staff              → Add staff user to a shop
 *   POST /admin/users/:userId/reset-password     → Reset any user's password
 */
@Public() // Admin routes use x-admin-key header instead of JWT
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Validates the admin key from request headers.
   * Throws 401 if missing or wrong.
   */
  private checkAdminKey(key: string | undefined) {
    if (!key || key !== process.env.ADMIN_KEY) {
      throw new UnauthorizedException('Invalid or missing admin key');
    }
  }

  /**
   * @route POST /admin/shops
   * @description Create a new shop + owner user + default units (Adet, KG).
   * @header x-admin-key - Your secret admin key from .env
   * @body { shopName, ownerUsername, ownerPassword }
   *
   * Example:
   *   POST /admin/shops
   *   x-admin-key: my-secret-admin-key-2026
   *   { "shopName": "Ali'nin Bakkalı", "ownerUsername": "ali", "ownerPassword": "Ali123!" }
   */
  @Post('shops')
  createShop(
    @Headers('x-admin-key') adminKey: string,
    @Body() dto: CreateShopWithOwnerDto,
  ) {
    this.checkAdminKey(adminKey);
    return this.adminService.createShopWithOwner(dto);
  }

  /**
   * @route GET /admin/shops
   * @description List all shops with their owner and counts.
   * @header x-admin-key - Your secret admin key from .env
   */
  @Get('shops')
  listShops(@Headers('x-admin-key') adminKey: string) {
    this.checkAdminKey(adminKey);
    return this.adminService.listAllShops();
  }

  /**
   * @route POST /admin/shops/:shopId/staff
   * @description Add a staff user to an existing shop.
   * @header x-admin-key - Your secret admin key from .env
   * @body { username, password }
   */
  @Post('shops/:shopId/staff')
  addStaff(
    @Headers('x-admin-key') adminKey: string,
    @Param('shopId', ParseIntPipe) shopId: number,
    @Body() body: { username: string; password: string },
  ) {
    this.checkAdminKey(adminKey);
    return this.adminService.addStaffUser(shopId, body.username, body.password);
  }

  /**
   * @route POST /admin/users/:userId/reset-password
   * @description Reset a user's password (when they forget it).
   * @header x-admin-key - Your secret admin key from .env
   * @body { newPassword }
   */
  @Post('users/:userId/reset-password')
  resetPassword(
    @Headers('x-admin-key') adminKey: string,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body: { newPassword: string },
  ) {
    this.checkAdminKey(adminKey);
    return this.adminService.resetPassword(userId, body.newPassword);
  }
}
