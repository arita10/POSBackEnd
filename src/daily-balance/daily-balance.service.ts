import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { CloseDayDto } from './dto/close-day.dto';

/**
 * @class DailyBalanceService
 * @description Implements the core accounting formulas for the Bakkal POS.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  THE TWO FORMULAS (The heart of this entire system)         ║
 * ║                                                              ║
 * ║  Income Left (Devir) =                                      ║
 * ║    totalSystemSelling - totalExpenseSum + yesterdayBalance   ║
 * ║                                                              ║
 * ║  Difference (Fark) =                                        ║
 * ║    (cashCountManual + creditCountManual + debtCountManual)   ║
 * ║    - incomeLeft                                              ║
 * ╚══════════════════════════════════════════════════════════════╝
 */
@Injectable()
export class DailyBalanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @function preview
   * @description Shows what the daily balance WILL look like before closing.
   * The owner can see the system totals and enter their manual counts
   * to preview the difference — without saving anything yet.
   *
   * FLOW: Owner opens the app → sees today's system totals →
   *       enters their manual counts → previews the result →
   *       if happy, confirms with closeDay()
   *
   * @param {number} shopId - The shop to preview for.
   * @param {string} date - The date to preview "YYYY-MM-DD".
   * @returns {Promise<Object>} System totals and yesterday's balance.
   */
  async preview(shopId: number, date: string) {
    // Get today's total system sales
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const [salesResult, expenseResult, yesterdayRecord] = await Promise.all([
      // Sum all sales for today
      this.prisma.salesTransaction.aggregate({
        where: { shopId, createdAt: { gte: startOfDay, lte: endOfDay } },
        _sum: { totalPrice: true },
        _count: true,
      }),
      // Sum all expenses for today
      this.prisma.expenseItem.aggregate({
        where: { shopId, transactionDate: { gte: startOfDay, lte: endOfDay } },
        _sum: { itemAmount: true },
        _count: true,
      }),
      // Get previous day's incomeLeft as today's yesterdayBalance
      this.prisma.dailyBalanceRecord.findFirst({
        where: {
          shopId,
          recordDate: { lt: startOfDay },
        },
        orderBy: { recordDate: 'desc' },
        select: { incomeLeft: true, recordDate: true },
      }),
    ]);

    const totalSystemSelling = new Decimal(
      salesResult._sum.totalPrice?.toString() ?? '0',
    );
    const totalExpenseSum = new Decimal(
      expenseResult._sum.itemAmount?.toString() ?? '0',
    );
    const yesterdayBalance = new Decimal(
      yesterdayRecord?.incomeLeft?.toString() ?? '0',
    );

    // Calculate Income Left (what SHOULD be in drawer)
    const incomeLeft = totalSystemSelling
      .minus(totalExpenseSum)
      .plus(yesterdayBalance);

    return {
      date,
      totalSystemSelling: totalSystemSelling.toFixed(2),
      totalExpenseSum: totalExpenseSum.toFixed(2),
      yesterdayBalance: yesterdayBalance.toFixed(2),
      salesTransactionCount: salesResult._count,
      expenseCount: expenseResult._count,
      projectedIncomeLeft: incomeLeft.toFixed(2),
      tip: 'Enter your manual counts to see the Difference',
    };
  }

  /**
   * @function closeDay
   * @description Closes the day by recording the final balance.
   * This is the OFFICIAL end-of-day action. Calculates and stores
   * both the Difference and Income Left formulas permanently.
   *
   * BUSINESS RULES:
   *   1. Can only be done ONCE per day (@@unique[shopId, recordDate])
   *   2. System fetches sales & expense totals automatically
   *   3. yesterdayBalance comes from the previous day's incomeLeft
   *   4. Both formulas are calculated server-side (tamper-proof)
   *   5. incomeLeft is stored and will become NEXT day's yesterdayBalance
   *
   * @param {number} shopId - The shop closing its day.
   * @param {CloseDayDto} dto - Owner's manual count { cashCountManual, creditCountManual, debtCountManual }
   * @returns {Promise<DailyBalanceRecord>} The saved balance record with all calculations.
   * @throws {ConflictException} If this day has already been closed.
   */
  async closeDay(shopId: number, dto: CloseDayDto) {
    const date = dto.recordDate;
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    // Check: has this day already been closed?
    const existing = await this.prisma.dailyBalanceRecord.findFirst({
      where: { shopId, recordDate: startOfDay },
    });

    if (existing) {
      throw new ConflictException(
        `Day ${date} has already been closed. Use the history endpoint to view it.`,
      );
    }

    // ── Fetch all required data in parallel (efficient) ──
    const [salesResult, expenseResult, yesterdayRecord] = await Promise.all([
      this.prisma.salesTransaction.aggregate({
        where: { shopId, createdAt: { gte: startOfDay, lte: endOfDay } },
        _sum: { totalPrice: true },
      }),
      this.prisma.expenseItem.aggregate({
        where: { shopId, transactionDate: { gte: startOfDay, lte: endOfDay } },
        _sum: { itemAmount: true },
      }),
      this.prisma.dailyBalanceRecord.findFirst({
        where: { shopId, recordDate: { lt: startOfDay } },
        orderBy: { recordDate: 'desc' },
        select: { incomeLeft: true },
      }),
    ]);

    // ── Build Decimal values for precise calculation ──
    const totalSystemSelling = new Decimal(
      salesResult._sum.totalPrice?.toString() ?? '0',
    );
    const totalExpenseSum = new Decimal(
      expenseResult._sum.itemAmount?.toString() ?? '0',
    );
    const yesterdayBalance = new Decimal(
      yesterdayRecord?.incomeLeft?.toString() ?? '0',
    );
    const cashCount = new Decimal(dto.cashCountManual);
    const creditCount = new Decimal(dto.creditCountManual);
    const debtCount = new Decimal(dto.debtCountManual);

    // ══════════════════════════════════════════════════
    // FORMULA 1: Income Left (Devir)
    // What the system says SHOULD be in the drawer.
    // This becomes tomorrow's yesterdayBalance.
    //
    // incomeLeft = totalSystemSelling - totalExpenseSum + yesterdayBalance
    // ══════════════════════════════════════════════════
    const incomeLeft = totalSystemSelling
      .minus(totalExpenseSum)
      .plus(yesterdayBalance);

    // ══════════════════════════════════════════════════
    // FORMULA 2: Difference (Fark)
    // How far the owner's physical count deviates from
    // what the system expects.
    //
    // difference = (cashCount + creditCount + debtCount) - incomeLeft
    // Positive = SURPLUS (owner has more cash than expected)
    // Negative = DEFICIT (money is missing)
    // ══════════════════════════════════════════════════
    const manualTotal = cashCount.plus(creditCount).plus(debtCount);
    const difference = manualTotal.minus(incomeLeft);

    // ── Save everything permanently ──
    const record = await this.prisma.dailyBalanceRecord.create({
      data: {
        shopId,
        recordDate: startOfDay,
        yesterdayBalance,
        cashCountManual: cashCount,
        creditCountManual: creditCount,
        debtCountManual: debtCount,
        totalSystemSelling,
        totalExpenseSum,
        incomeLeft,
        difference,
      },
    });
    return this.serializeRecord(record);
  }

  /**
   * @function findAll
   * @description Lists all daily balance records for a shop (history).
   * TENANCY: Only returns records WHERE shopId matches.
   * @param {number} shopId - The shop to get history for.
   * @returns {Promise<DailyBalanceRecord[]>} All balance records, newest first.
   */
  async findAll(shopId: number) {
    const records = await this.prisma.dailyBalanceRecord.findMany({
      where: { shopId },
      orderBy: { recordDate: 'desc' },
    });
    return records.map((r) => this.serializeRecord(r));
  }

  /**
   * @function findOne
   * @description Retrieves a single day's balance record.
   * @param {number} shopId - The shop the record must belong to.
   * @param {number} id - The record's unique identifier.
   * @returns {Promise<DailyBalanceRecord>} The balance record.
   * @throws {NotFoundException} If record not found in this shop.
   */
  async findOne(shopId: number, id: number) {
    const record = await this.prisma.dailyBalanceRecord.findFirst({
      where: { id, shopId },
    });

    if (!record) {
      throw new NotFoundException(
        `Daily balance record with ID ${id} not found in shop ${shopId}`,
      );
    }

    return this.serializeRecord(record);
  }

  private serializeRecord(r: any) {
    return {
      id: r.id,
      shopId: r.shopId,
      recordDate: r.recordDate?.toISOString(),
      yesterdayBalance: r.yesterdayBalance?.toString() ?? '0',
      cashCountManual: r.cashCountManual?.toString() ?? '0',
      creditCountManual: r.creditCountManual?.toString() ?? '0',
      debtCountManual: r.debtCountManual?.toString() ?? '0',
      totalSystemSelling: r.totalSystemSelling?.toString() ?? '0',
      totalExpenseSum: r.totalExpenseSum?.toString() ?? '0',
      incomeLeft: r.incomeLeft?.toString() ?? '0',
      difference: r.difference?.toString() ?? '0',
      createdAt: r.createdAt?.toISOString(),
    };
  }
}
