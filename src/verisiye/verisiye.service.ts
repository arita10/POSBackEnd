import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class VerisiyeService {
  constructor(private readonly prisma: PrismaService) {}

  // ── CUSTOMERS ──────────────────────────────────────────────

  async findAllCustomers(shopId: number) {
    const customers = await this.prisma.veriSiyeCustomer.findMany({
      where: { shopId, isActive: true },
      orderBy: { name: 'asc' },
    });

    // Attach computed balance to each customer
    const withBalances = await Promise.all(
      customers.map((c) => this.attachBalance(c)),
    );
    return withBalances;
  }

  async findOneCustomer(shopId: number, customerId: number) {
    const customer = await this.prisma.veriSiyeCustomer.findFirst({
      where: { id: customerId, shopId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found in shop ${shopId}`);
    }
    return this.attachBalance(customer);
  }

  async createCustomer(shopId: number, dto: CreateCustomerDto) {
    try {
      const customer = await this.prisma.veriSiyeCustomer.create({
        data: { shopId, name: dto.name, homeNo: dto.homeNo ?? null, telNo: dto.telNo, notes: dto.notes ?? null },
      });
      return this.attachBalance(customer);
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new BadRequestException('Bu telefon numarası zaten kayıtlı.');
      }
      throw new BadRequestException(err?.message ?? 'Müşteri kaydedilemedi.');
    }
  }

  async updateCustomer(shopId: number, customerId: number, dto: Partial<CreateCustomerDto>) {
    await this.findOneCustomer(shopId, customerId);
    try {
      const updated = await this.prisma.veriSiyeCustomer.update({
        where: { id: customerId },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.homeNo !== undefined && { homeNo: dto.homeNo || null }),
          ...(dto.telNo !== undefined && { telNo: dto.telNo }),
          ...(dto.notes !== undefined && { notes: dto.notes || null }),
        },
      });
      return this.attachBalance(updated);
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new BadRequestException('Bu telefon numarası zaten kayıtlı.');
      }
      throw new BadRequestException(err?.message ?? 'Müşteri güncellenemedi.');
    }
  }

  async deactivateCustomer(shopId: number, customerId: number) {
    await this.findOneCustomer(shopId, customerId);
    return this.prisma.veriSiyeCustomer.update({
      where: { id: customerId },
      data: { isActive: false },
    });
  }

  // ── CUSTOMER DETAIL (transactions + payments) ──────────────

  async getCustomerDetail(shopId: number, customerId: number) {
    const customer = await this.findOneCustomer(shopId, customerId);

    const [sales, payments] = await Promise.all([
      this.prisma.salesTransaction.findMany({
        where: { shopId, customerId, paymentType: 'verisiye' },
        include: {
          items: {
            include: { product: { select: { productName: true, unit: { select: { unitName: true } } } } },
          },
          user: { select: { username: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.veriSiyePayment.findMany({
        where: { shopId, customerId },
        include: { user: { select: { username: true } } },
        orderBy: { paymentDate: 'desc' },
      }),
    ]);

    const mappedSales = sales.map((t) => ({
      id: t.id,
      totalAmount: t.totalPrice.toString(),
      createdAt: t.createdAt.toISOString(),
      recordedBy: t.user?.username ?? '',
      items: t.items.map((i) => ({
        productName: i.product?.productName ?? '',
        unitName: i.product?.unit?.unitName ?? '',
        quantity: i.quantity.toString(),
        priceAtSale: i.priceAtSale.toString(),
        lineTotal: new Decimal(i.quantity.toString()).mul(new Decimal(i.priceAtSale.toString())).toFixed(2),
      })),
    }));

    const mappedPayments = payments.map((p) => ({
      id: p.id,
      amount: p.amount.toString(),
      note: p.note,
      paymentDate: p.paymentDate.toISOString().slice(0, 10),
      recordedBy: p.user?.username ?? '',
      createdAt: p.createdAt.toISOString(),
    }));

    return { customer, sales: mappedSales, payments: mappedPayments };
  }

  // ── PAYMENTS ───────────────────────────────────────────────

  async createPayment(shopId: number, dto: CreatePaymentDto) {
    await this.findOneCustomer(shopId, dto.customerId);

    if (!dto.amount || dto.amount <= 0) {
      throw new BadRequestException('Ödeme tutarı sıfırdan büyük olmalıdır.');
    }

    const payment = await this.prisma.veriSiyePayment.create({
      data: {
        shopId,
        customerId: dto.customerId,
        amount: dto.amount,
        note: dto.note ?? null,
        recordedBy: dto.recordedBy,
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
      },
      include: { user: { select: { username: true } } },
    });

    return {
      id: payment.id,
      customerId: payment.customerId,
      amount: payment.amount.toString(),
      note: payment.note,
      paymentDate: payment.paymentDate.toISOString().slice(0, 10),
      recordedBy: payment.user?.username ?? '',
      createdAt: payment.createdAt.toISOString(),
    };
  }

  // ── HELPERS ────────────────────────────────────────────────

  /**
   * Compute balance dynamically:
   * balance = SUM(verisiye sales) - SUM(payments)
   */
  private async attachBalance(customer: any) {
    const [salesAgg, paymentsAgg] = await Promise.all([
      this.prisma.salesTransaction.aggregate({
        where: { customerId: customer.id, paymentType: 'verisiye' },
        _sum: { totalPrice: true },
      }),
      this.prisma.veriSiyePayment.aggregate({
        where: { customerId: customer.id },
        _sum: { amount: true },
      }),
    ]);

    const totalDebt = new Decimal(salesAgg._sum.totalPrice?.toString() ?? '0');
    const totalPaid = new Decimal(paymentsAgg._sum.amount?.toString() ?? '0');
    const balance = totalDebt.minus(totalPaid);

    return {
      id: customer.id,
      shopId: customer.shopId,
      name: customer.name,
      homeNo: customer.homeNo,
      telNo: customer.telNo,
      notes: customer.notes,
      isActive: customer.isActive,
      createdAt: customer.createdAt?.toISOString(),
      balance: balance.toFixed(2),
    };
  }
}
