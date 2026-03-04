import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShopWithOwnerDto } from './dto/create-shop-with-owner.dto';
import * as bcrypt from 'bcrypt';

/**
 * @class AdminService
 * @description SaaS admin operations — only callable by the system owner (YOU).
 *
 * This is how you onboard a new bakkal customer:
 *   1. Customer pays you and gives you their shop name + desired credentials
 *   2. You call POST /admin/shops with their details
 *   3. System creates: shop + owner user + default product units (Adet, KG)
 *   4. Customer can immediately log in with their credentials
 */
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @function createShopWithOwner
   * @description Creates a new tenant shop + owner user + default units in one transaction.
   * Password is bcrypt hashed before storing.
   * @param {CreateShopWithOwnerDto} dto - Shop name + owner credentials
   * @returns The new shop, owner user, and default units created
   */
  async createShopWithOwner(dto: CreateShopWithOwnerDto) {
    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(dto.ownerPassword, 10);

    // Create everything atomically — if any step fails, nothing is saved
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create the shop
      const shop = await tx.shop.create({
        data: { shopName: dto.shopName },
      });

      // 2. Create the owner user for this shop
      const owner = await tx.user.create({
        data: {
          shopId: shop.id,
          username: dto.ownerUsername,
          password: hashedPassword,
          role: 'OWNER',
        },
      });

      // 3. Create default product units (Adet and KG) for the new shop
      const units = await tx.productUnit.createMany({
        data: [
          { shopId: shop.id, unitName: 'Adet' },
          { shopId: shop.id, unitName: 'KG' },
        ],
      });

      return { shop, owner: { ...owner, password: undefined }, unitsCreated: units.count };
    });

    return {
      message: 'Shop created successfully',
      shopId: result.shop.id,
      shopName: result.shop.shopName,
      ownerUsername: result.owner.username,
      defaultUnitsCreated: result.unitsCreated,
    };
  }

  /**
   * @function addStaffUser
   * @description Adds a staff user to an existing shop.
   * The shop owner can also do this via the regular users API,
   * but this admin route lets YOU do it on their behalf.
   * @param {number} shopId - The shop to add the staff member to
   * @param {string} username - Staff login username
   * @param {string} password - Staff login password (will be hashed)
   */
  async addStaffUser(shopId: number, username: string, password: string) {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        shopId,
        username,
        password: hashedPassword,
        role: 'STAFF',
      },
    });

    // Create default permissions (all false — owner grants access later)
    await this.prisma.permission.create({
      data: {
        userId: user.id,
        canManageStock: false,
        canViewReports: false,
      },
    });

    return {
      message: 'Staff user created',
      userId: user.id,
      shopId: user.shopId,
      username: user.username,
      role: user.role,
    };
  }

  /**
   * @function listAllShops
   * @description Returns all shops with their owner users.
   * Useful for you to see all your customers at a glance.
   */
  async listAllShops() {
    return this.prisma.shop.findMany({
      include: {
        users: {
          where: { role: 'OWNER' },
          select: { id: true, username: true, role: true },
        },
        _count: { select: { products: true, users: true } },
      },
      orderBy: { id: 'asc' },
    });
  }

  /**
   * @function resetPassword
   * @description Resets a user's password. Use this when a shop owner forgets theirs.
   * @param {number} userId - The user's ID
   * @param {string} newPassword - The new plain-text password (will be hashed)
   */
  async resetPassword(userId: number, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
      select: { id: true, username: true, shopId: true },
    });
    return { message: 'Password reset successfully', user };
  }
}
