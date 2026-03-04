import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

/**
 * @class UsersService
 * @description Handles all business logic for User management.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  TENANCY RULE: Every method receives shopId as a parameter. ║
 * ║  Every database query includes WHERE shopId = X.            ║
 * ║  This ensures Shop A can NEVER see Shop B's users.          ║
 * ╚══════════════════════════════════════════════════════════════╝
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @function create
   * @description Creates a new user within a specific shop.
   * The shopId comes from the URL, NOT the request body (security).
   * Also creates a default Permission record for the user.
   * @param {number} shopId - The shop this user belongs to.
   * @param {CreateUserDto} dto - User registration data.
   * @returns {Promise<User>} The newly created user with permissions.
   * @throws {ConflictException} If username already exists in this shop.
   */
  async create(shopId: number, dto: CreateUserDto) {
    // Check if username is already taken WITHIN this shop
    const existingUser = await this.prisma.user.findUnique({
      where: {
        shopId_username: { shopId, username: dto.username },
      },
    });

    if (existingUser) {
      throw new ConflictException(
        `Username "${dto.username}" is already taken in this shop`,
      );
    }

    // Create user AND default permission in a single transaction
    return this.prisma.user.create({
      data: {
        shopId,
        username: dto.username,
        password: dto.password, // TODO: Hash with bcrypt in Phase 2
        role: dto.role,
        permission: {
          create: {
            canManageStock: dto.role === 'OWNER',
            canViewReports: dto.role === 'OWNER',
          },
        },
      },
      include: { permission: true },
    });
  }

  /**
   * @function findAllByShop
   * @description Lists all users belonging to a specific shop.
   * TENANCY: Only returns users WHERE shopId matches.
   * @param {number} shopId - The shop to list users for.
   * @returns {Promise<User[]>} Array of users in this shop.
   */
  async findAllByShop(shopId: number) {
    return this.prisma.user.findMany({
      where: { shopId },
      select: {
        id: true,
        shopId: true,
        username: true,
        role: true,
        createdAt: true,
        permission: true,
        // NOTE: password is NOT selected (never expose passwords in API)
      },
    });
  }

  /**
   * @function findOne
   * @description Retrieves a single user by ID, scoped to a shop.
   * TENANCY: Both shopId AND userId must match. A user from Shop 2
   * cannot be retrieved by providing Shop 1's shopId.
   * @param {number} shopId - The shop the user must belong to.
   * @param {number} userId - The user's unique identifier.
   * @returns {Promise<User>} The user record with permissions.
   * @throws {NotFoundException} If user not found in this shop.
   */
  async findOne(shopId: number, userId: number) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, shopId },
      select: {
        id: true,
        shopId: true,
        username: true,
        role: true,
        createdAt: true,
        permission: true,
      },
    });

    if (!user) {
      throw new NotFoundException(
        `User with ID ${userId} not found in shop ${shopId}`,
      );
    }

    return user;
  }

  /**
   * @function update
   * @description Updates a user's details within their shop.
   * TENANCY: Verifies the user belongs to the given shopId before updating.
   * @param {number} shopId - The shop the user must belong to.
   * @param {number} userId - The user's unique identifier.
   * @param {UpdateUserDto} dto - Fields to update.
   * @returns {Promise<User>} The updated user record.
   * @throws {NotFoundException} If user not found in this shop.
   */
  async update(shopId: number, userId: number, dto: UpdateUserDto) {
    await this.findOne(shopId, userId); // Ensure user exists in this shop

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.username && { username: dto.username }),
        ...(dto.password && { password: dto.password }),
        ...(dto.role && { role: dto.role }),
      },
      include: { permission: true },
    });
  }

  /**
   * @function remove
   * @description Permanently deletes a user from a shop.
   * CASCADE will also delete their Permission record.
   * TENANCY: Verifies the user belongs to the given shopId before deleting.
   * @param {number} shopId - The shop the user must belong to.
   * @param {number} userId - The user's unique identifier.
   * @returns {Promise<User>} The deleted user record.
   * @throws {NotFoundException} If user not found in this shop.
   */
  async remove(shopId: number, userId: number) {
    await this.findOne(shopId, userId); // Ensure user exists in this shop

    return this.prisma.user.delete({
      where: { id: userId },
    });
  }
}
