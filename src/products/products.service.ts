import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';

/**
 * @class ProductsService
 * @description Handles all business logic for product and inventory management.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  TENANCY: Every method receives shopId and filters by it.   ║
 * ║  STOCK MATH: Uses Decimal for precise KG calculations.      ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * STOCK PRECISION RULES:
 *   - Adet (piece): whole numbers only → 5.000, 48.000
 *   - KG (weight): up to 3 decimal places → 0.750, 3.500, 10.250
 *   - Prisma returns Decimal objects, not plain numbers
 *   - We use Decimal arithmetic to avoid floating-point errors
 *     (e.g., 0.1 + 0.2 = 0.30000000000000004 in JS, but 0.3 in Decimal)
 */
@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @function create
   * @description Adds a new product to a shop's inventory.
   * Validates that the unit exists in this shop before creating.
   * @param {number} shopId - The shop this product belongs to.
   * @param {CreateProductDto} dto - Product details.
   * @returns {Promise<Product>} The newly created product with unit info.
   * @throws {NotFoundException} If the specified unit doesn't exist in this shop.
   */
  async create(shopId: number, dto: CreateProductDto) {
    // Verify the unit belongs to this shop (tenancy check)
    const unit = await this.prisma.productUnit.findFirst({
      where: { id: dto.unitId, shopId },
    });

    if (!unit) {
      throw new NotFoundException(
        `Product unit with ID ${dto.unitId} not found in shop ${shopId}`,
      );
    }

    try {
      const created = await this.prisma.product.create({
        data: {
          shopId,
          unitId: dto.unitId,
          barcode: dto.barcode || null,
          productName: dto.productName,
          costPrice: Number.isFinite(dto.costPrice) ? dto.costPrice : 0,
          salePrice: dto.salePrice,
          stockQuantity: Number.isFinite(dto.stockQuantity) ? dto.stockQuantity : 0,
        },
        include: { unit: true },
      });
      return this.serializeProduct(created);
    } catch (err: any) {
      // P2002 = Unique constraint failed (e.g. duplicate barcode)
      if (err?.code === 'P2002') {
        throw new BadRequestException(
          'Bu barkod zaten başka bir ürüne ait. Farklı bir barkod girin veya barkod alanını boş bırakın.',
        );
      }
      throw new BadRequestException(err?.message ?? 'Ürün kaydedilemedi.');
    }
  }

  /**
   * @function findAllByShop
   * @description Lists all products in a shop's inventory.
   * Includes the unit name so the frontend knows if it's Adet or KG.
   * Adds a computed `profit` field: salePrice - costPrice per unit.
   * TENANCY: Only returns products WHERE shopId matches.
   * @param {number} shopId - The shop to list products for.
   * @returns {Promise<Product[]>} Array of products with unit info and profit.
   */
  async findAllByShop(shopId: number) {
    const products = await this.prisma.product.findMany({
      where: { shopId },
      include: {
        unit: { select: { id: true, unitName: true } },
        _count: { select: { priceComparisons: true } },
      },
      orderBy: { productName: 'asc' },
    });

    return products.map((p) => this.serializeProduct(p));
  }

  /**
   * @function findOne
   * @description Retrieves a single product by ID, scoped to a shop.
   * TENANCY: Both shopId AND productId must match.
   * @param {number} shopId - The shop the product must belong to.
   * @param {number} productId - The product's unique identifier.
   * @returns {Promise<Product>} The product with unit and price comparisons.
   * @throws {NotFoundException} If product not found in this shop.
   */
  async findOne(shopId: number, productId: number) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, shopId },
      include: {
        unit: true,
        priceComparisons: true,
      },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with ID ${productId} not found in shop ${shopId}`,
      );
    }

    return this.serializeProduct(product);
  }

  /**
   * @function update
   * @description Updates a product's details (name, price, barcode, etc.)
   * TENANCY: Verifies the product belongs to the given shopId.
   * @param {number} shopId - The shop the product must belong to.
   * @param {number} productId - The product's unique identifier.
   * @param {UpdateProductDto} dto - Fields to update.
   * @returns {Promise<Product>} The updated product record.
   * @throws {NotFoundException} If product not found in this shop.
   */
  async update(shopId: number, productId: number, dto: UpdateProductDto) {
    await this.findOne(shopId, productId);

    // If changing unit, verify new unit belongs to this shop
    if (dto.unitId) {
      const unit = await this.prisma.productUnit.findFirst({
        where: { id: dto.unitId, shopId },
      });
      if (!unit) {
        throw new NotFoundException(
          `Product unit with ID ${dto.unitId} not found in shop ${shopId}`,
        );
      }
    }

    try {
      const updated = await this.prisma.product.update({
        where: { id: productId },
        data: {
          ...(dto.unitId && { unitId: dto.unitId }),
          ...(dto.barcode !== undefined && { barcode: dto.barcode || null }),
          ...(dto.productName && { productName: dto.productName }),
          ...(dto.costPrice !== undefined && { costPrice: Number.isFinite(dto.costPrice) ? dto.costPrice : 0 }),
          ...(dto.salePrice !== undefined && { salePrice: dto.salePrice }),
          ...(dto.stockQuantity !== undefined && {
            stockQuantity: Number.isFinite(dto.stockQuantity) ? dto.stockQuantity : 0,
          }),
        },
        include: { unit: true },
      });
      return this.serializeProduct(updated);
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new BadRequestException(
          'Bu barkod zaten başka bir ürüne ait. Farklı bir barkod girin veya barkod alanını boş bırakın.',
        );
      }
      throw new BadRequestException(err?.message ?? 'Ürün güncellenemedi.');
    }
  }

  /**
   * @function adjustStock
   * @description Adjusts a product's stock quantity (add or remove).
   *
   * BUSINESS LOGIC:
   *   - "add": New delivery arrived. Stock goes UP.
   *     Current: 48.000 + Add: 24.000 = New: 72.000
   *
   *   - "remove": Damaged goods or manual correction. Stock goes DOWN.
   *     Current: 10.500 - Remove: 2.750 = New: 7.750
   *
   * SAFETY: Cannot reduce stock below zero.
   *
   * WHY use Prisma's increment/decrement instead of manual math?
   *   Because it uses SQL: UPDATE SET stock = stock + 24
   *   This is ATOMIC — if two people adjust at the same time,
   *   both changes are applied correctly (no race condition).
   *
   * @param {number} shopId - The shop the product must belong to.
   * @param {number} productId - The product's unique identifier.
   * @param {AdjustStockDto} dto - { type: "add"|"remove", quantity: number }
   * @returns {Promise<Product>} The product with updated stock.
   * @throws {NotFoundException} If product not found in this shop.
   * @throws {BadRequestException} If removing more stock than available.
   */
  async adjustStock(shopId: number, productId: number, dto: AdjustStockDto) {
    const product = await this.findOne(shopId, productId);

    if (dto.quantity <= 0) {
      throw new BadRequestException('Quantity must be a positive number');
    }

    // If removing, check there's enough stock
    if (dto.type === 'remove') {
      const currentStock = new Decimal(product.stockQuantity.toString());
      const removeAmount = new Decimal(dto.quantity);

      if (currentStock.lessThan(removeAmount)) {
        throw new BadRequestException(
          `Not enough stock. Current: ${currentStock}, Trying to remove: ${removeAmount}`,
        );
      }
    }

    // Use atomic increment/decrement for thread safety
    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        stockQuantity:
          dto.type === 'add'
            ? { increment: dto.quantity }
            : { decrement: dto.quantity },
      },
      include: { unit: true },
    });
    return this.serializeProduct(updated);
  }

  /**
   * @function remove
   * @description Permanently deletes a product from a shop's inventory.
   * CASCADE will also delete all price comparisons for this product.
   * @param {number} shopId - The shop the product must belong to.
   * @param {number} productId - The product's unique identifier.
   * @returns {Promise<Product>} The deleted product record.
   * @throws {NotFoundException} If product not found in this shop.
   */
  async remove(shopId: number, productId: number) {
    await this.findOne(shopId, productId);

    const salesCount = await this.prisma.salesItem.count({
      where: { productId },
    });

    if (salesCount > 0) {
      throw new BadRequestException(
        `Bu ürün ${salesCount} satış kaydında kullanılmış ve silinemez.`,
      );
    }

    const deleted = await this.prisma.product.delete({
      where: { id: productId },
    });
    return this.serializeProduct(deleted);
  }

  private serializeProduct(p: any) {
    const cost = p.costPrice?.toString() ?? '0';
    const sale = p.salePrice?.toString() ?? '0';
    return {
      id: p.id,
      shopId: p.shopId,
      unitId: p.unitId,
      barcode: p.barcode,
      productName: p.productName,
      costPrice: cost,
      salePrice: sale,
      stockQuantity: p.stockQuantity?.toString() ?? '0',
      createdAt: p.createdAt?.toISOString(),
      updatedAt: p.updatedAt?.toISOString(),
      unit: p.unit ?? null,
      priceComparisons: p.priceComparisons ?? undefined,
      _count: p._count ?? undefined,
    };
  }
}
