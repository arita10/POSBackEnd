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

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(shopId: number, dto: CreateProductDto) {
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
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        },
        include: { unit: true },
      });
      return this.serializeProduct(created);
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new BadRequestException(
          'Bu barkod zaten başka bir ürüne ait. Farklı bir barkod girin veya barkod alanını boş bırakın.',
        );
      }
      throw new BadRequestException(err?.message ?? 'Ürün kaydedilemedi.');
    }
  }

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

  async update(shopId: number, productId: number, dto: UpdateProductDto, changedBy?: number) {
    const existing = await this.prisma.product.findFirst({
      where: { id: productId, shopId },
    });
    if (!existing) {
      throw new NotFoundException(
        `Product with ID ${productId} not found in shop ${shopId}`,
      );
    }

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

    const oldPrice = new Decimal(existing.salePrice.toString());
    const newPriceChanged =
      dto.salePrice !== undefined &&
      !new Decimal(dto.salePrice.toString()).equals(oldPrice);

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
          ...(dto.expiryDate !== undefined && {
            expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
          }),
        },
        include: { unit: true },
      });

      // Log price change and reprice open verisiye if salePrice changed
      if (newPriceChanged && changedBy) {
        const newPrice = new Decimal(dto.salePrice!.toString());
        await this.prisma.productPriceHistory.create({
          data: {
            productId,
            shopId,
            oldPrice,
            newPrice,
            changedBy,
          },
        });
        await this.repriceOpenVerisiye(shopId, productId, newPrice);
      }

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

  async getPriceHistory(shopId: number, productId: number) {
    await this.findOne(shopId, productId);
    const rows = await this.prisma.productPriceHistory.findMany({
      where: { productId, shopId },
      include: { user: { select: { username: true } } },
      orderBy: { changedAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      oldPrice: r.oldPrice.toString(),
      newPrice: r.newPrice.toString(),
      changedBy: r.user?.username ?? '',
      changedAt: r.changedAt.toISOString(),
    }));
  }

  async adjustStock(shopId: number, productId: number, dto: AdjustStockDto) {
    const product = await this.findOne(shopId, productId);

    if (dto.quantity <= 0) {
      throw new BadRequestException('Quantity must be a positive number');
    }

    if (dto.type === 'remove') {
      const currentStock = new Decimal(product.stockQuantity.toString());
      const removeAmount = new Decimal(dto.quantity);

      if (currentStock.lessThan(removeAmount)) {
        throw new BadRequestException(
          `Not enough stock. Current: ${currentStock}, Trying to remove: ${removeAmount}`,
        );
      }
    }

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

  // ── PRIVATE HELPERS ──────────────────────────────────────────

  private async repriceOpenVerisiye(shopId: number, productId: number, newPrice: Decimal) {
    // Find all verisiye sale items for this product in this shop
    const items = await this.prisma.salesItem.findMany({
      where: { productId, transaction: { shopId, paymentType: 'verisiye' } },
      select: { id: true, transactionId: true, transaction: { select: { customerId: true } } },
    });

    if (items.length === 0) return;

    const customerIds = [...new Set(
      items.map((i) => i.transaction.customerId).filter((id): id is number => id !== null),
    )];

    for (const customerId of customerIds) {
      // Check if customer has an open balance
      const [salesAgg, paymentsAgg] = await Promise.all([
        this.prisma.salesTransaction.aggregate({
          where: { customerId, paymentType: 'verisiye' },
          _sum: { totalPrice: true },
        }),
        this.prisma.veriSiyePayment.aggregate({
          where: { customerId },
          _sum: { amount: true },
        }),
      ]);

      const totalDebt = new Decimal(salesAgg._sum.totalPrice?.toString() ?? '0');
      const totalPaid = new Decimal(paymentsAgg._sum.amount?.toString() ?? '0');
      const balance = totalDebt.minus(totalPaid);

      if (!balance.gt(0)) continue;

      // Get transaction IDs for this customer that contain this product
      const txnIds = [...new Set(
        items
          .filter((i) => i.transaction.customerId === customerId)
          .map((i) => i.transactionId),
      )];

      for (const txnId of txnIds) {
        // Update priceAtSale for this product in this transaction
        await this.prisma.salesItem.updateMany({
          where: { transactionId: txnId, productId },
          data: { priceAtSale: newPrice },
        });

        // Recalculate transaction total
        const allItems = await this.prisma.salesItem.findMany({
          where: { transactionId: txnId },
          select: { quantity: true, priceAtSale: true },
        });

        const newTotal = allItems.reduce(
          (sum, item) =>
            sum.plus(
              new Decimal(item.quantity.toString()).times(new Decimal(item.priceAtSale.toString())),
            ),
          new Decimal(0),
        );

        await this.prisma.salesTransaction.update({
          where: { id: txnId },
          data: { totalPrice: newTotal },
        });
      }
    }
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
      expiryDate: p.expiryDate ? p.expiryDate.toISOString().slice(0, 10) : null,
      createdAt: p.createdAt?.toISOString(),
      updatedAt: p.updatedAt?.toISOString(),
      unit: p.unit ?? null,
      priceComparisons: p.priceComparisons ?? undefined,
      _count: p._count ?? undefined,
    };
  }
}
