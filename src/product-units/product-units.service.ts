import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductUnitDto } from './dto/create-product-unit.dto';
import { UpdateProductUnitDto } from './dto/update-product-unit.dto';

/**
 * @class ProductUnitsService
 * @description Handles business logic for product unit management (Adet, KG, Litre, etc.)
 *
 * TENANCY: Every method receives shopId and filters by it.
 * Shop 1's "KG" unit is completely separate from Shop 2's "KG" unit.
 *
 * BUSINESS RULE: When a shop first signs up, you should seed
 * the default units ("Adet", "KG") automatically.
 * This can be done in the shop creation flow (future improvement).
 */
@Injectable()
export class ProductUnitsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @function create
   * @description Creates a new measurement unit for a shop.
   * @param {number} shopId - The shop this unit belongs to.
   * @param {CreateProductUnitDto} dto - { unitName: "KG" }
   * @returns {Promise<ProductUnit>} The newly created unit.
   * @throws {ConflictException} If unit name already exists in this shop.
   */
  async create(shopId: number, dto: CreateProductUnitDto) {
    // Check if this unit name already exists in this shop
    const existing = await this.prisma.productUnit.findUnique({
      where: {
        shopId_unitName: { shopId, unitName: dto.unitName },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Unit "${dto.unitName}" already exists in this shop`,
      );
    }

    return this.prisma.productUnit.create({
      data: {
        shopId,
        unitName: dto.unitName,
      },
    });
  }

  /**
   * @function findAllByShop
   * @description Lists all measurement units for a specific shop.
   * TENANCY: Only returns units WHERE shopId matches.
   * @param {number} shopId - The shop to list units for.
   * @returns {Promise<ProductUnit[]>} Array of units with product counts.
   */
  async findAllByShop(shopId: number) {
    return this.prisma.productUnit.findMany({
      where: { shopId },
      include: {
        _count: { select: { products: true } },
      },
    });
  }

  /**
   * @function findOne
   * @description Retrieves a single unit by ID, scoped to a shop.
   * TENANCY: Both shopId AND unitId must match.
   * @param {number} shopId - The shop the unit must belong to.
   * @param {number} unitId - The unit's unique identifier.
   * @returns {Promise<ProductUnit>} The unit record.
   * @throws {NotFoundException} If unit not found in this shop.
   */
  async findOne(shopId: number, unitId: number) {
    const unit = await this.prisma.productUnit.findFirst({
      where: { id: unitId, shopId },
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!unit) {
      throw new NotFoundException(
        `Product unit with ID ${unitId} not found in shop ${shopId}`,
      );
    }

    return unit;
  }

  /**
   * @function update
   * @description Updates a unit's name within a shop.
   * TENANCY: Verifies the unit belongs to the given shopId.
   * @param {number} shopId - The shop the unit must belong to.
   * @param {number} unitId - The unit's unique identifier.
   * @param {UpdateProductUnitDto} dto - { unitName?: "Kilogram" }
   * @returns {Promise<ProductUnit>} The updated unit record.
   * @throws {NotFoundException} If unit not found in this shop.
   */
  async update(shopId: number, unitId: number, dto: UpdateProductUnitDto) {
    await this.findOne(shopId, unitId);

    return this.prisma.productUnit.update({
      where: { id: unitId },
      data: {
        ...(dto.unitName && { unitName: dto.unitName }),
      },
    });
  }

  /**
   * @function remove
   * @description Deletes a unit from a shop.
   * WARNING: This will fail if products are using this unit.
   * The products must be reassigned or deleted first.
   * @param {number} shopId - The shop the unit must belong to.
   * @param {number} unitId - The unit's unique identifier.
   * @returns {Promise<ProductUnit>} The deleted unit record.
   * @throws {NotFoundException} If unit not found in this shop.
   */
  async remove(shopId: number, unitId: number) {
    await this.findOne(shopId, unitId);

    return this.prisma.productUnit.delete({
      where: { id: unitId },
    });
  }
}
