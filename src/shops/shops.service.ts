import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';

/**
 * @class ShopsService
 * @description Handles all business logic for Shop (tenant) management.
 *
 * IMPORTANT: The Shop table is the ONLY table that does NOT filter by shopId,
 * because it IS the tenant itself. All other services (Users, Products, Sales)
 * will always include a shopId filter — but Shops are the root entity.
 */
@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @function create
   * @description Registers a new bakkal shop in the system.
   * This is called during the sign-up process.
   * @param {CreateShopDto} dto - The shop registration data.
   * @returns {Promise<Shop>} The newly created shop record.
   */
  async create(dto: CreateShopDto) {
    return this.prisma.shop.create({
      data: {
        shopName: dto.shopName,
      },
    });
  }

  /**
   * @function findAll
   * @description Lists all shops in the system.
   * NOTE: This is an ADMIN-ONLY endpoint. In production, this would
   * be protected by a super-admin role. Regular users never see this.
   * @returns {Promise<Shop[]>} Array of all registered shops.
   */
  async findAll() {
    return this.prisma.shop.findMany({
      include: {
        _count: { select: { users: true } },
      },
    });
  }

  /**
   * @function findOne
   * @description Retrieves a single shop by its ID.
   * @param {number} id - The shop's unique identifier.
   * @returns {Promise<Shop>} The shop record with user count.
   * @throws {NotFoundException} If the shop does not exist.
   */
  async findOne(id: number) {
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      include: {
        users: {
          select: { id: true, username: true, role: true },
        },
      },
    });

    if (!shop) {
      throw new NotFoundException(`Shop with ID ${id} not found`);
    }

    return shop;
  }

  /**
   * @function update
   * @description Updates a shop's details (name, status).
   * Example: When a subscription expires, update status to EXPIRED.
   * @param {number} id - The shop's unique identifier.
   * @param {UpdateShopDto} dto - The fields to update.
   * @returns {Promise<Shop>} The updated shop record.
   * @throws {NotFoundException} If the shop does not exist.
   */
  async update(id: number, dto: UpdateShopDto) {
    await this.findOne(id); // Ensure shop exists

    return this.prisma.shop.update({
      where: { id },
      data: {
        ...(dto.shopName && { shopName: dto.shopName }),
        ...(dto.status && { status: dto.status }),
      },
    });
  }

  /**
   * @function remove
   * @description Permanently deletes a shop and ALL its related data.
   * CASCADE delete will remove all users, permissions, and future
   * products/sales tied to this shop.
   * WARNING: This is irreversible. In production, consider soft-delete instead.
   * @param {number} id - The shop's unique identifier.
   * @returns {Promise<Shop>} The deleted shop record.
   * @throws {NotFoundException} If the shop does not exist.
   */
  async remove(id: number) {
    await this.findOne(id); // Ensure shop exists

    return this.prisma.shop.delete({
      where: { id },
    });
  }
}
