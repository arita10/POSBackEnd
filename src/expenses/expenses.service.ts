import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

/**
 * @class ExpensesService
 * @description Handles all business logic for expense tracking.
 *
 * TENANCY: Every method receives shopId and filters by it.
 *
 * BUSINESS PURPOSE:
 * Expenses feed into the Daily Balance formula (Phase 4):
 *   total_expense_sum = SUM of all expense_items for the day
 * This is subtracted from sales to calculate the net income.
 */
@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @function create
   * @description Records a new business expense for a shop.
   * @param {number} shopId - The shop recording this expense.
   * @param {CreateExpenseDto} dto - Expense details.
   * @returns {Promise<ExpenseItem>} The newly created expense record.
   */
  async create(shopId: number, dto: CreateExpenseDto) {
    // For @db.Date columns Prisma expects midnight UTC to avoid timezone drift.
    // "2026-03-04" → new Date("2026-03-04T00:00:00.000Z")
    const dateStr = dto.transactionDate ?? new Date().toISOString().slice(0, 10);
    const transactionDate = new Date(`${dateStr}T00:00:00.000Z`);

    const record = await this.prisma.expenseItem.create({
      data: {
        shopId,
        vendorName: dto.vendorName,
        itemAmount: parseFloat(String(dto.itemAmount)),
        expenseType: dto.expenseType,
        transactionDate,
      },
    });
    return this.serializeExpense(record);
  }

  /**
   * @function findAllByShop
   * @description Lists all expenses for a shop, optionally filtered by date.
   * TENANCY: Only returns expenses WHERE shopId matches.
   * @param {number} shopId - The shop to list expenses for.
   * @param {string} [date] - Optional date filter "YYYY-MM-DD".
   * @returns {Promise<ExpenseItem[]>} Array of expense records.
   */
  async findAllByShop(shopId: number, date?: string) {
    const where: any = { shopId };

    if (date) {
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);
      where.transactionDate = { gte: startOfDay, lte: endOfDay };
    }

    const rows = await this.prisma.expenseItem.findMany({
      where,
      orderBy: { transactionDate: 'desc' },
    });
    return rows.map((r) => this.serializeExpense(r));
  }

  /**
   * @function findOne
   * @description Retrieves a single expense by ID, scoped to a shop.
   * TENANCY: Both shopId AND expenseId must match.
   * @param {number} shopId - The shop the expense must belong to.
   * @param {number} expenseId - The expense's unique identifier.
   * @returns {Promise<ExpenseItem>} The expense record.
   * @throws {NotFoundException} If expense not found in this shop.
   */
  async findOne(shopId: number, expenseId: number) {
    const expense = await this.prisma.expenseItem.findFirst({
      where: { id: expenseId, shopId },
    });

    if (!expense) {
      throw new NotFoundException(
        `Expense with ID ${expenseId} not found in shop ${shopId}`,
      );
    }

    return this.serializeExpense(expense);
  }

  /**
   * @function update
   * @description Updates an expense record.
   * @param {number} shopId - The shop the expense must belong to.
   * @param {number} expenseId - The expense's unique identifier.
   * @param {UpdateExpenseDto} dto - Fields to update.
   * @returns {Promise<ExpenseItem>} The updated expense record.
   */
  async update(shopId: number, expenseId: number, dto: UpdateExpenseDto) {
    await this.findOne(shopId, expenseId);

    const record = await this.prisma.expenseItem.update({
      where: { id: expenseId },
      data: {
        ...(dto.vendorName && { vendorName: dto.vendorName }),
        ...(dto.itemAmount !== undefined && { itemAmount: parseFloat(String(dto.itemAmount)) }),
        ...(dto.expenseType && { expenseType: dto.expenseType }),
        ...(dto.transactionDate && {
          transactionDate: new Date(dto.transactionDate),
        }),
      },
    });
    return this.serializeExpense(record);
  }

  /**
   * @function remove
   * @description Deletes an expense record.
   * @param {number} shopId - The shop the expense must belong to.
   * @param {number} expenseId - The expense's unique identifier.
   * @returns {Promise<ExpenseItem>} The deleted record.
   */
  async remove(shopId: number, expenseId: number) {
    await this.findOne(shopId, expenseId);

    const record = await this.prisma.expenseItem.delete({
      where: { id: expenseId },
    });
    return this.serializeExpense(record);
  }

  private serializeExpense(e: any) {
    // transactionDate is @db.Date — slice to "YYYY-MM-DD" for clean frontend display
    const txDate = e.transactionDate instanceof Date
      ? e.transactionDate.toISOString().slice(0, 10)
      : String(e.transactionDate ?? '').slice(0, 10);

    return {
      id: e.id,
      shopId: e.shopId,
      vendorName: e.vendorName,
      expenseType: e.expenseType,
      itemAmount: e.itemAmount?.toString() ?? '0',
      transactionDate: txDate,
      createdAt: e.createdAt?.toISOString(),
    };
  }

  /**
   * @function getDailyTotal
   * @description Calculates total expenses for a specific date.
   * Used by Phase 4 (Daily Balance) to get total_expense_sum.
   * @param {number} shopId - The shop to calculate for.
   * @param {string} date - Date in "YYYY-MM-DD" format.
   * @returns {Promise<Object>} Total expense amount and count for the day.
   */
  async getDailyTotal(shopId: number, date: string) {
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const expenses = await this.prisma.expenseItem.findMany({
      where: {
        shopId,
        transactionDate: { gte: startOfDay, lte: endOfDay },
      },
      select: { itemAmount: true, expenseType: true },
    });

    const totalExpense = expenses.reduce(
      (sum, e) => sum.add(new Decimal(e.itemAmount.toString())),
      new Decimal(0),
    );

    return {
      date,
      expenseCount: expenses.length,
      totalExpenses: totalExpense.toFixed(2),
    };
  }
}
