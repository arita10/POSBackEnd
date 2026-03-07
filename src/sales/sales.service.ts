import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { CreateSaleDto } from './dto/create-sale.dto';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(shopId: number, dto: CreateSaleDto) {
    if (!dto.userId) throw new BadRequestException('userId is required');
    if (!dto.items || dto.items.length === 0) throw new BadRequestException('A sale must have at least one item');

    const paymentType = dto.paymentType === 'verisiye' ? 'verisiye' : 'nakit';
    if (paymentType === 'verisiye' && !dto.customerId) {
      throw new BadRequestException('Verisiye satışı için müşteri seçilmesi gerekiyor.');
    }

    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds }, shopId } });

    if (products.length !== productIds.length) throw new NotFoundException('One or more products not found in this shop');

    const productMap = new Map(products.map((p) => [p.id, p]));
    let totalPrice = new Decimal(0);

    for (const item of dto.items) {
      const product = productMap.get(item.productId)!;
      const qty = new Decimal(item.quantity);
      if (new Decimal(product.stockQuantity).lessThan(qty)) {
        throw new BadRequestException(`Not enough stock for "${product.productName}". Available: ${product.stockQuantity}, Requested: ${qty}`);
      }
      totalPrice = totalPrice.add(qty.mul(new Decimal(product.salePrice.toString())));
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const transaction = await tx.salesTransaction.create({
          data: { shopId, userId: dto.userId, totalPrice, paymentType, customerId: paymentType === 'verisiye' ? (dto.customerId ?? null) : null },
        });

        for (const item of dto.items) {
          const product = productMap.get(item.productId)!;
          await tx.salesItem.create({ data: { transactionId: transaction.id, productId: item.productId, quantity: item.quantity, priceAtSale: product.salePrice } });
          await tx.product.update({ where: { id: item.productId }, data: { stockQuantity: { decrement: item.quantity } } });
        }

        const result = await tx.salesTransaction.findUnique({
          where: { id: transaction.id },
          include: { user: { select: { id: true, username: true } }, items: { include: { product: { select: { id: true, productName: true, unit: true } } } } },
        });
        return this.mapTransaction(result);
      });
    } catch (err: any) {
      if (err?.status) throw err;
      throw new InternalServerErrorException(err?.message ?? 'Sale creation failed');
    }
  }

  private mapTransaction(t: any) {
    if (!t) return null;
    return {
      id: t.id, shopId: t.shopId, userId: t.userId,
      totalAmount: t.totalPrice?.toString() ?? '0',
      paymentType: t.paymentType ?? 'nakit',
      customerId: t.customerId ?? null,
      createdAt: t.createdAt?.toISOString(),
      items: (t.items ?? []).map((item: any) => ({
        id: item.id, saleId: item.transactionId, productId: item.productId,
        productName: item.product?.productName ?? '',
        quantity: item.quantity?.toString() ?? '0',
        priceAtSale: item.priceAtSale?.toString() ?? '0',
        lineTotal: (parseFloat(item.quantity?.toString() ?? '0') * parseFloat(item.priceAtSale?.toString() ?? '0')).toFixed(2),
        unit: item.product?.unit ?? null,
      })),
    };
  }

  async findAllByShop(shopId: number) {
    const rows = await this.prisma.salesTransaction.findMany({
      where: { shopId },
      include: { user: { select: { id: true, username: true } }, items: { include: { product: { select: { id: true, productName: true, unit: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((t) => this.mapTransaction(t));
  }

  async findOne(shopId: number, transactionId: number) {
    const transaction = await this.prisma.salesTransaction.findFirst({
      where: { id: transactionId, shopId },
      include: { user: { select: { id: true, username: true } }, items: { include: { product: { select: { id: true, productName: true, unit: { select: { unitName: true } } } } } } },
    });
    if (!transaction) throw new NotFoundException(`Transaction with ID ${transactionId} not found in shop ${shopId}`);
    return this.mapTransaction(transaction);
  }

  async getProfitReport(shopId: number, from: string, to: string) {
    const start = new Date(`${from}T00:00:00.000Z`);
    const end   = new Date(`${to}T23:59:59.999Z`);
    const items = await this.prisma.salesItem.findMany({
      where: { transaction: { shopId, createdAt: { gte: start, lte: end } } },
      include: { product: { select: { id: true, productName: true, costPrice: true, unit: { select: { unitName: true } } } } },
    });

    const map = new Map<number, { productName: string; unitName: string; qtySold: Decimal; revenue: Decimal; cost: Decimal }>();
    for (const item of items) {
      const qty = new Decimal(item.quantity.toString());
      const salePrice = new Decimal(item.priceAtSale.toString());
      const costPrice = new Decimal(item.product.costPrice?.toString() ?? '0');
      const existing = map.get(item.productId);
      if (existing) {
        existing.qtySold = existing.qtySold.add(qty);
        existing.revenue = existing.revenue.add(qty.mul(salePrice));
        existing.cost    = existing.cost.add(qty.mul(costPrice));
      } else {
        map.set(item.productId, { productName: item.product.productName, unitName: item.product.unit?.unitName ?? '', qtySold: qty, revenue: qty.mul(salePrice), cost: qty.mul(costPrice) });
      }
    }

    let totalRevenue = new Decimal(0), totalCost = new Decimal(0), totalProfit = new Decimal(0);
    const products = Array.from(map.entries()).map(([productId, v]) => {
      const profit = v.revenue.minus(v.cost);
      totalRevenue = totalRevenue.add(v.revenue);
      totalCost    = totalCost.add(v.cost);
      totalProfit  = totalProfit.add(profit);
      return { productId, productName: v.productName, unitName: v.unitName, qtySold: v.qtySold.toFixed(3), revenue: v.revenue.toFixed(2), cost: v.cost.toFixed(2), profit: profit.toFixed(2) };
    }).sort((a, b) => parseFloat(b.profit) - parseFloat(a.profit));

    return { from, to, totalRevenue: totalRevenue.toFixed(2), totalCost: totalCost.toFixed(2), totalProfit: totalProfit.toFixed(2), products };
  }

  async getDailySummary(shopId: number, date: string) {
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay   = new Date(`${date}T23:59:59.999Z`);
    const transactions = await this.prisma.salesTransaction.findMany({ where: { shopId, createdAt: { gte: startOfDay, lte: endOfDay } }, select: { totalPrice: true } });
    const totalSelling = transactions.reduce((sum, t) => sum.add(new Decimal(t.totalPrice.toString())), new Decimal(0));
    return { date, transactionCount: transactions.length, totalSales: totalSelling.toFixed(2) };
  }
}
