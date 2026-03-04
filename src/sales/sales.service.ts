import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { CreateSaleDto } from './dto/create-sale.dto';

/**
 * @class SalesService
 * @description Handles all business logic for sales transactions.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  KEY CONCEPT: Prisma Interactive Transactions ($transaction) ║
 * ║                                                              ║
 * ║  When recording a sale, ALL of these must succeed together  ║
 * ║  or ALL must fail (rollback). We never want:                ║
 * ║    - Stock deducted but transaction not saved               ║
 * ║    - Transaction saved but stock not deducted               ║
 * ║                                                              ║
 * ║  Prisma's $transaction() wraps all DB operations in a       ║
 * ║  single atomic SQL transaction. If ANY step fails, the      ║
 * ║  entire sale is rolled back automatically.                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 */
@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @function create
   * @description Records a complete sale with all items atomically.
   *
   * STEP-BY-STEP PROCESS:
   *   1. Validate all products exist in this shop
   *   2. Check all products have sufficient stock
   *   3. Calculate total price from current product prices (server-side)
   *   4. In ONE atomic transaction:
   *      a. Create the SalesTransaction (header)
   *      b. Create each SalesItem (detail) with price snapshot
   *      c. Deduct stock from each product
   *
   * WHY calculate price server-side?
   * The client could send a fake total price. By calculating on the server
   * from the current product.salePrice, we prevent price manipulation.
   *
   * @param {number} shopId - The shop making this sale.
   * @param {CreateSaleDto} dto - { userId, items: [{productId, quantity}] }
   * @returns {Promise<SalesTransaction>} The completed transaction with items.
   * @throws {BadRequestException} If items array is empty.
   * @throws {NotFoundException} If any product not found in this shop.
   * @throws {BadRequestException} If any product has insufficient stock.
   */
  async create(shopId: number, dto: CreateSaleDto) {
    if (!dto.userId) {
      throw new BadRequestException('userId is required');
    }
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('A sale must have at least one item');
    }

    // ── STEP 1: Load all products in a single query (efficient) ──
    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, shopId },
    });

    // Check every requested product was found in this shop
    if (products.length !== productIds.length) {
      throw new NotFoundException(
        'One or more products not found in this shop',
      );
    }

    // Create a map for O(1) lookup: { productId → product }
    const productMap = new Map(products.map((p) => [p.id, p]));

    // ── STEP 2: Validate stock and calculate total ──
    let totalPrice = new Decimal(0);

    for (const item of dto.items) {
      const product = productMap.get(item.productId)!;
      const qty = new Decimal(item.quantity);

      // Check: is there enough stock?
      if (new Decimal(product.stockQuantity).lessThan(qty)) {
        throw new BadRequestException(
          `Not enough stock for "${product.productName}". ` +
            `Available: ${product.stockQuantity}, Requested: ${qty}`,
        );
      }

      // Price for this line = quantity × salePrice
      // e.g., 3 × 25.50 = 76.50 TL
      const lineTotal = qty.mul(new Decimal(product.salePrice.toString()));
      totalPrice = totalPrice.add(lineTotal);
    }

    // ── STEP 3: Execute everything atomically ──
    // If the server crashes mid-way, nothing is saved. No partial sales!
    try {
    return await this.prisma.$transaction(async (tx) => {
      // 3a. Create the SalesTransaction header
      const transaction = await tx.salesTransaction.create({
        data: {
          shopId,
          userId: dto.userId,
          totalPrice,
        },
      });

      // 3b. Create each SalesItem AND deduct stock simultaneously
      for (const item of dto.items) {
        const product = productMap.get(item.productId)!;

        // Create the detail row (price snapshot preserved!)
        await tx.salesItem.create({
          data: {
            transactionId: transaction.id,
            productId: item.productId,
            quantity: item.quantity,
            priceAtSale: product.salePrice, // ← snapshot at time of sale
          },
        });

        // Deduct stock atomically
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.quantity } },
        });
      }

      // 3c. Return the full transaction with items and product names
      const result = await tx.salesTransaction.findUnique({
        where: { id: transaction.id },
        include: {
          user: { select: { id: true, username: true } },
          items: {
            include: {
              product: { select: { id: true, productName: true, unit: true } },
            },
          },
        },
      });

      // Map to frontend-friendly shape (totalAmount, saleId, lineTotal)
      return this.mapTransaction(result);
    });
    } catch (err: any) {
      // Surface actual Prisma/DB error to the client instead of generic 500
      throw new InternalServerErrorException(err?.message ?? 'Sale creation failed');
    }
  }

  /** Map a raw Prisma SalesTransaction to the frontend Sale shape. */
  private mapTransaction(t: any) {
    if (!t) return null;
    return {
      id: t.id,
      shopId: t.shopId,
      userId: t.userId,
      totalAmount: t.totalPrice?.toString() ?? '0',
      createdAt: t.createdAt?.toISOString(),
      items: (t.items ?? []).map((item: any) => ({
        id: item.id,
        saleId: item.transactionId,
        productId: item.productId,
        productName: item.product?.productName ?? '',
        quantity: item.quantity?.toString() ?? '0',
        priceAtSale: item.priceAtSale?.toString() ?? '0',
        lineTotal: (
          parseFloat(item.quantity?.toString() ?? '0') *
          parseFloat(item.priceAtSale?.toString() ?? '0')
        ).toFixed(2),
        unit: item.product?.unit ?? null,
      })),
    };
  }

  /**
   * @function findAllByShop
   * @description Lists all sales transactions for a shop.
   * TENANCY: Only returns transactions WHERE shopId matches.
   * @param {number} shopId - The shop to list sales for.
   * @returns {Promise<SalesTransaction[]>} Array of transactions with totals.
   */
  async findAllByShop(shopId: number) {
    const rows = await this.prisma.salesTransaction.findMany({
      where: { shopId },
      include: {
        user: { select: { id: true, username: true } },
        items: {
          include: {
            product: { select: { id: true, productName: true, unit: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((t) => this.mapTransaction(t));
  }

  /**
   * @function findOne
   * @description Retrieves a single sale with all its items (receipt view).
   * TENANCY: Both shopId AND transactionId must match.
   * @param {number} shopId - The shop the transaction must belong to.
   * @param {number} transactionId - The transaction's unique identifier.
   * @returns {Promise<SalesTransaction>} Full receipt with all items.
   * @throws {NotFoundException} If transaction not found in this shop.
   */
  async findOne(shopId: number, transactionId: number) {
    const transaction = await this.prisma.salesTransaction.findFirst({
      where: { id: transactionId, shopId },
      include: {
        user: { select: { id: true, username: true } },
        items: {
          include: {
            product: {
              select: {
                id: true,
                productName: true,
                unit: { select: { unitName: true } },
              },
            },
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException(
        `Transaction with ID ${transactionId} not found in shop ${shopId}`,
      );
    }

    return this.mapTransaction(transaction);
  }

  /**
   * @function getDailySummary
   * @description Calculates total sales for a specific date.
   * This feeds into the Daily Balance calculation in Phase 4.
   * @param {number} shopId - The shop to summarize.
   * @param {string} date - The date in "YYYY-MM-DD" format.
   * @returns {Promise<Object>} Total sales amount and transaction count.
   */
  async getDailySummary(shopId: number, date: string) {
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const transactions = await this.prisma.salesTransaction.findMany({
      where: {
        shopId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      select: { totalPrice: true },
    });

    const totalSelling = transactions.reduce(
      (sum, t) => sum.add(new Decimal(t.totalPrice.toString())),
      new Decimal(0),
    );

    return {
      date,
      transactionCount: transactions.length,
      totalSales: totalSelling.toFixed(2),
    };
  }
}
