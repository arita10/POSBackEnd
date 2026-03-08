import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Decimal } from '@prisma/client/runtime/library';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class VerisiyeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // ── CUSTOMERS ──────────────────────────────────────────────

  async findAllCustomers(shopId: number) {
    const sid = Number(shopId);
    const customers = await this.prisma.veriSiyeCustomer.findMany({
      where: { shopId: sid, isActive: true },
      orderBy: { name: 'asc' },
    });

    const withBalances = await Promise.all(
      customers.map((c) => this.attachBalance(c)),
    );
    return withBalances;
  }

  async findOneCustomer(shopId: number, customerId: number) {
    const sid = Number(shopId);
    const customer = await this.prisma.veriSiyeCustomer.findFirst({
      where: { id: Number(customerId), shopId: sid },
    });
    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found in shop ${shopId}`);
    }
    return this.attachBalance(customer);
  }

  async createCustomer(shopId: number, dto: CreateCustomerDto) {
    const sid = Number(shopId);

    // Verify shop exists first to give a clear error
    const shop = await this.prisma.shop.findUnique({ where: { id: sid } });
    if (!shop) {
      throw new BadRequestException(`Shop ${sid} not found`);
    }

    try {
      const customer = await this.prisma.veriSiyeCustomer.create({
        data: { shopId: sid, name: dto.name, homeNo: dto.homeNo ?? null, telNo: dto.telNo, notes: dto.notes ?? null },
      });
      return this.attachBalance(customer);
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new BadRequestException('Bu telefon numarası zaten kayıtlı.');
      }
      if (err?.code === 'P2003') {
        throw new BadRequestException(`Dükkan bulunamadı (shopId: ${sid}).`);
      }
      throw new BadRequestException(err?.message ?? 'Müşteri kaydedilemedi.');
    }
  }

  async updateCustomer(shopId: number, customerId: number, dto: Partial<CreateCustomerDto>) {
    await this.findOneCustomer(shopId, customerId);
    try {
      const updated = await this.prisma.veriSiyeCustomer.update({
        where: { id: Number(customerId) },
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
      where: { id: Number(customerId) },
      data: { isActive: false },
    });
  }

  // ── CUSTOMER DETAIL (transactions + payments) ──────────────

  async getCustomerDetail(shopId: number, customerId: number) {
    const sid = Number(shopId);
    const cid = Number(customerId);
    const customer = await this.findOneCustomer(sid, cid);

    const [sales, payments] = await Promise.all([
      this.prisma.salesTransaction.findMany({
        where: { shopId: sid, customerId: cid, paymentType: 'verisiye' },
        include: {
          items: {
            include: { product: { select: { productName: true, unit: { select: { unitName: true } } } } },
          },
          user: { select: { username: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.veriSiyePayment.findMany({
        where: { shopId: sid, customerId: cid },
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
    const sid = Number(shopId);
    await this.findOneCustomer(sid, dto.customerId);

    if (!dto.amount || dto.amount <= 0) {
      throw new BadRequestException('Ödeme tutarı sıfırdan büyük olmalıdır.');
    }

    const payment = await this.prisma.veriSiyePayment.create({
      data: {
        shopId: sid,
        customerId: Number(dto.customerId),
        amount: dto.amount,
        note: dto.note ?? null,
        recordedBy: Number(dto.recordedBy),
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

  // ── CUSTOMER PORTAL ────────────────────────────────────────

  async portalLogin(shopId: number, homeNo: string, telNo: string) {
    const sid = Number(shopId);
    const customer = await this.prisma.veriSiyeCustomer.findFirst({
      where: { shopId: sid, homeNo, telNo, isActive: true },
    });

    if (!customer) {
      throw new UnauthorizedException('Ev numarası veya telefon numarası hatalı.');
    }

    const payload = {
      sub: customer.id,
      shopId: sid,
      role: 'CUSTOMER',
      type: 'portal',
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET ?? 'fallback-secret',
      expiresIn: '30d',
    });

    return {
      accessToken,
      customer: { id: customer.id, name: customer.name, homeNo: customer.homeNo, shopId: sid },
    };
  }

  async getMyPortalData(shopId: number, customerId: number) {
    return this.getCustomerDetail(shopId, customerId);
  }

  // ── HELPERS ────────────────────────────────────────────────

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
