import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(shopId: number, dto: CreateExpenseDto) {
    const dateStr = dto.transactionDate ?? new Date().toISOString().slice(0, 10);
    const transactionDate = new Date(`${dateStr}T00:00:00.000Z`);

    const record = await this.prisma.expenseItem.create({
      data: {
        shopId,
        vendorName: dto.vendorName,
        vendorId: dto.vendorId ?? null,
        itemAmount: parseFloat(String(dto.itemAmount)),
        expenseType: dto.expenseType,
        transactionDate,
      },
    });
    return this.serializeExpense(record);
  }

  async findAllByShop(shopId: number, date?: string) {
    const where: any = { shopId };
    if (date) {
      where.transactionDate = {
        gte: new Date(`${date}T00:00:00.000Z`),
        lte: new Date(`${date}T23:59:59.999Z`),
      };
    }
    const rows = await this.prisma.expenseItem.findMany({
      where,
      orderBy: { transactionDate: 'desc' },
    });
    return rows.map((r) => this.serializeExpense(r));
  }

  async findOne(shopId: number, expenseId: number) {
    const expense = await this.prisma.expenseItem.findFirst({
      where: { id: expenseId, shopId },
    });
    if (!expense) {
      throw new NotFoundException(`Expense ${expenseId} not found in shop ${shopId}`);
    }
    return this.serializeExpense(expense);
  }

  async update(shopId: number, expenseId: number, dto: UpdateExpenseDto) {
    await this.findOne(shopId, expenseId);
    const record = await this.prisma.expenseItem.update({
      where: { id: expenseId },
      data: {
        ...(dto.vendorName !== undefined && { vendorName: dto.vendorName }),
        ...(dto.vendorId !== undefined && { vendorId: dto.vendorId }),
        ...(dto.itemAmount !== undefined && { itemAmount: parseFloat(String(dto.itemAmount)) }),
        ...(dto.expenseType !== undefined && { expenseType: dto.expenseType }),
        ...(dto.transactionDate !== undefined && {
          transactionDate: new Date(`${dto.transactionDate}T00:00:00.000Z`),
        }),
      },
    });
    return this.serializeExpense(record);
  }

  async remove(shopId: number, expenseId: number) {
    await this.findOne(shopId, expenseId);
    const record = await this.prisma.expenseItem.delete({ where: { id: expenseId } });
    return this.serializeExpense(record);
  }

  private serializeExpense(e: any) {
    const txDate = e.transactionDate instanceof Date
      ? e.transactionDate.toISOString().slice(0, 10)
      : String(e.transactionDate ?? '').slice(0, 10);
    return {
      id: e.id,
      shopId: e.shopId,
      vendorId: e.vendorId ?? null,
      vendorName: e.vendorName,
      expenseType: e.expenseType,
      itemAmount: e.itemAmount?.toString() ?? '0',
      transactionDate: txDate,
      createdAt: e.createdAt?.toISOString(),
    };
  }

  /** Returns daily totals grouped by expense type — used by daily-balance preview/close */
  async getDailyTotalByType(shopId: number, date: string) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end   = new Date(`${date}T23:59:59.999Z`);

    const expenses = await this.prisma.expenseItem.findMany({
      where: { shopId, transactionDate: { gte: start, lte: end } },
      select: { itemAmount: true, expenseType: true },
    });

    const totals: Record<string, Decimal> = {
      kasa_gider:  new Decimal(0),
      devir_gider: new Decimal(0),
      kart_gider:  new Decimal(0),
    };
    let totalAll = new Decimal(0);

    for (const e of expenses) {
      const amt = new Decimal(e.itemAmount.toString());
      totalAll = totalAll.add(amt);
      const key = e.expenseType in totals ? e.expenseType : 'kasa_gider';
      totals[key] = totals[key].add(amt);
    }

    return {
      date,
      expenseCount: expenses.length,
      totalExpenses: totalAll.toFixed(2),
      totalKasaGider:  totals.kasa_gider.toFixed(2),
      totalDevirGider: totals.devir_gider.toFixed(2),
      totalKartGider:  totals.kart_gider.toFixed(2),
    };
  }

  /** Legacy — kept for existing usages */
  async getDailyTotal(shopId: number, date: string) {
    return this.getDailyTotalByType(shopId, date);
  }
}
