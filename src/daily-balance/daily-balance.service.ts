import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExpensesService } from '../expenses/expenses.service';
import { Decimal } from '@prisma/client/runtime/library';
import { CloseDayDto } from './dto/close-day.dto';

/**
 * DailyBalanceService — core accounting formulas:
 *
 *   Formula 1 — Devir Kalan:
 *     devirKalan = dunDevir - totalDevirGider
 *
 *   Formula 2 — Beklenen Kasa (incomeLeft):
 *     incomeLeft = totalSystemSelling - totalKasaGider - totalKartGider + devirKalan
 *
 *   Formula 3 — Fark:
 *     fark = (kasaNakit + krediler + verisiye) - incomeLeft
 */
@Injectable()
export class DailyBalanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expensesService: ExpensesService,
  ) {}

  async preview(shopId: number, date: string, dunDevir = 0) {
    const start = new Date(date + 'T00:00:00.000Z');
    const end   = new Date(date + 'T23:59:59.999Z');

    const [salesResult, expTotals] = await Promise.all([
      this.prisma.salesTransaction.aggregate({
        where: { shopId, createdAt: { gte: start, lte: end } },
        _sum: { totalPrice: true },
        _count: true,
      }),
      this.expensesService.getDailyTotalByType(shopId, date),
    ]);

    const totalSystemSelling = new Decimal(salesResult._sum.totalPrice?.toString() ?? '0');
    const totalKasaGider     = new Decimal(expTotals.totalKasaGider);
    const totalDevirGider    = new Decimal(expTotals.totalDevirGider);
    const totalKartGider     = new Decimal(expTotals.totalKartGider);
    const totalExpenseSum    = new Decimal(expTotals.totalExpenses);
    const dunDevirDec        = new Decimal(dunDevir);

    const devirKalan = dunDevirDec.minus(totalDevirGider);
    const incomeLeft = totalSystemSelling.minus(totalKasaGider).minus(totalKartGider).plus(devirKalan);

    return {
      date,
      dunDevir:              dunDevirDec.toFixed(2),
      totalSystemSelling:    totalSystemSelling.toFixed(2),
      totalKasaGider:        totalKasaGider.toFixed(2),
      totalDevirGider:       totalDevirGider.toFixed(2),
      totalKartGider:        totalKartGider.toFixed(2),
      totalExpenseSum:       totalExpenseSum.toFixed(2),
      devirKalan:            devirKalan.toFixed(2),
      projectedIncomeLeft:   incomeLeft.toFixed(2),
      salesTransactionCount: salesResult._count,
      expenseCount:          expTotals.expenseCount,
    };
  }

  async closeDay(shopId: number, dto: CloseDayDto) {
    const date  = dto.recordDate;
    const start = new Date(date + 'T00:00:00.000Z');
    const end   = new Date(date + 'T23:59:59.999Z');

    const existing = await this.prisma.dailyBalanceRecord.findFirst({ where: { shopId, recordDate: start } });
    if (existing) throw new ConflictException('Day ' + date + ' has already been closed.');

    const [salesResult, expTotals] = await Promise.all([
      this.prisma.salesTransaction.aggregate({
        where: { shopId, createdAt: { gte: start, lte: end } },
        _sum: { totalPrice: true },
      }),
      this.expensesService.getDailyTotalByType(shopId, date),
    ]);

    const totalSystemSelling = new Decimal(salesResult._sum.totalPrice?.toString() ?? '0');
    const totalKasaGider     = new Decimal(expTotals.totalKasaGider);
    const totalDevirGider    = new Decimal(expTotals.totalDevirGider);
    const totalKartGider     = new Decimal(expTotals.totalKartGider);
    const totalExpenseSum    = new Decimal(expTotals.totalExpenses);
    const dunDevirDec        = new Decimal(dto.dunDevir ?? 0);
    const kasaNakit          = new Decimal(dto.kasaNakit ?? 0);
    const krediler           = new Decimal(dto.krediler ?? 0);
    const verisiye           = new Decimal(dto.verisiye ?? 0);

    const devirKalan  = dunDevirDec.minus(totalDevirGider);
    const incomeLeft  = totalSystemSelling.minus(totalKasaGider).minus(totalKartGider).plus(devirKalan);
    const manualTotal = kasaNakit.plus(krediler).plus(verisiye);
    const difference  = manualTotal.minus(incomeLeft);

    const record = await this.prisma.dailyBalanceRecord.create({
      data: {
        shopId,
        recordDate:         start,
        dunDevir:           dunDevirDec,
        totalKasaGider,
        totalDevirGider,
        totalKartGider,
        totalExpenseSum,
        totalSystemSelling,
        devirKalan,
        kasaNakit,
        krediler,
        verisiye,
        incomeLeft,
        difference,
      },
    });
    return this.serializeRecord(record);
  }

  async findAll(shopId: number) {
    const records = await this.prisma.dailyBalanceRecord.findMany({
      where: { shopId },
      orderBy: { recordDate: 'desc' },
    });
    return records.map((r) => this.serializeRecord(r));
  }

  async findOne(shopId: number, id: number) {
    const record = await this.prisma.dailyBalanceRecord.findFirst({ where: { id, shopId } });
    if (!record) throw new NotFoundException('Record ' + id + ' not found');
    return this.serializeRecord(record);
  }

  async getReport(shopId: number, period: string, date: string) {
    const pivot = new Date(date + 'T00:00:00.000Z');
    let start: Date;
    let end: Date;

    if (period === 'daily') {
      start = pivot;
      end   = new Date(date + 'T23:59:59.999Z');
    } else if (period === 'weekly') {
      const day  = pivot.getUTCDay();
      const diff = day === 0 ? -6 : 1 - day;
      start = new Date(pivot);
      start.setUTCDate(pivot.getUTCDate() + diff);
      end = new Date(start);
      end.setUTCDate(start.getUTCDate() + 6);
      end.setUTCHours(23, 59, 59, 999);
    } else {
      start = new Date(Date.UTC(pivot.getUTCFullYear(), pivot.getUTCMonth(), 1));
      end   = new Date(Date.UTC(pivot.getUTCFullYear(), pivot.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    }

    const records = await this.prisma.dailyBalanceRecord.findMany({
      where: { shopId, recordDate: { gte: start, lte: end } },
      orderBy: { recordDate: 'asc' },
    });

    const serialized = records.map((r) => this.serializeRecord(r));

    let totalSelling    = new Decimal(0);
    let totalKasaGider  = new Decimal(0);
    let totalDevirGider = new Decimal(0);
    let totalKartGider  = new Decimal(0);
    let totalExpense    = new Decimal(0);
    let totalProfit     = new Decimal(0);

    for (const r of records) {
      const s = new Decimal(r.totalSystemSelling.toString());
      const e = new Decimal(r.totalExpenseSum.toString());
      totalSelling    = totalSelling.add(s);
      totalKasaGider  = totalKasaGider.add(new Decimal(r.totalKasaGider.toString()));
      totalDevirGider = totalDevirGider.add(new Decimal(r.totalDevirGider.toString()));
      totalKartGider  = totalKartGider.add(new Decimal(r.totalKartGider.toString()));
      totalExpense    = totalExpense.add(e);
      totalProfit     = totalProfit.add(s.minus(e));
    }

    return {
      period,
      from:               start.toISOString().slice(0, 10),
      to:                 end.toISOString().slice(0, 10),
      daysClosed:         records.length,
      totalSystemSelling: totalSelling.toFixed(2),
      totalKasaGider:     totalKasaGider.toFixed(2),
      totalDevirGider:    totalDevirGider.toFixed(2),
      totalKartGider:     totalKartGider.toFixed(2),
      totalExpenseSum:    totalExpense.toFixed(2),
      netProfit:          totalProfit.toFixed(2),
      records:            serialized,
    };
  }

  private serializeRecord(r: any) {
    return {
      id:                 r.id,
      shopId:             r.shopId,
      recordDate:         r.recordDate?.toISOString().slice(0, 10),
      dunDevir:           r.dunDevir?.toString() ?? '0',
      totalKasaGider:     r.totalKasaGider?.toString() ?? '0',
      totalDevirGider:    r.totalDevirGider?.toString() ?? '0',
      totalKartGider:     r.totalKartGider?.toString() ?? '0',
      totalExpenseSum:    r.totalExpenseSum?.toString() ?? '0',
      totalSystemSelling: r.totalSystemSelling?.toString() ?? '0',
      devirKalan:         r.devirKalan?.toString() ?? '0',
      kasaNakit:          r.kasaNakit?.toString() ?? '0',
      krediler:           r.krediler?.toString() ?? '0',
      verisiye:           r.verisiye?.toString() ?? '0',
      incomeLeft:         r.incomeLeft?.toString() ?? '0',
      difference:         r.difference?.toString() ?? '0',
      createdAt:          r.createdAt?.toISOString(),
    };
  }
}
