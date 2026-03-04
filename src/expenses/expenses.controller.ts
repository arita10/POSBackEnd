import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

/**
 * @controller ExpensesController
 * @description Handles HTTP requests for expense tracking.
 * Base route: /shops/:shopId/expenses
 *
 * Endpoints:
 *   POST   /shops/:shopId/expenses             → Record an expense
 *   GET    /shops/:shopId/expenses             → List all expenses (optionally filter by ?date=)
 *   GET    /shops/:shopId/expenses/daily?date= → Daily expense total
 *   GET    /shops/:shopId/expenses/:id         → Get one expense
 *   PUT    /shops/:shopId/expenses/:id         → Update an expense
 *   DELETE /shops/:shopId/expenses/:id         → Delete an expense
 */
@Controller('shops/:shopId/expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  /**
   * @route POST /shops/:shopId/expenses
   * @description Record a new business expense.
   * @body {CreateExpenseDto} dto - { vendorName, itemAmount, expenseType, transactionDate? }
   */
  @Post()
  create(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expensesService.create(shopId, dto);
  }

  /**
   * @route GET /shops/:shopId/expenses?date=YYYY-MM-DD
   * @description List all expenses. Optionally filter by date.
   * @query {string} [date] - Filter by date e.g. "2026-02-12"
   */
  @Get()
  findAll(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Query('date') date?: string,
  ) {
    return this.expensesService.findAllByShop(shopId, date);
  }

  /**
   * @route GET /shops/:shopId/expenses/daily?date=YYYY-MM-DD
   * @description Get total expense amount for a specific date.
   * Used by Phase 4 (Daily Balance) to get total_expense_sum.
   */
  @Get('daily')
  getDailyTotal(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Query('date') date: string,
  ) {
    const today = date || new Date().toISOString().split('T')[0];
    return this.expensesService.getDailyTotal(shopId, today);
  }

  /**
   * @route GET /shops/:shopId/expenses/:id
   * @description Get a single expense record.
   */
  @Get(':id')
  findOne(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.expensesService.findOne(shopId, id);
  }

  /**
   * @route PUT /shops/:shopId/expenses/:id
   * @description Update an expense record.
   */
  @Put(':id')
  update(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(shopId, id, dto);
  }

  /**
   * @route DELETE /shops/:shopId/expenses/:id
   * @description Delete an expense record.
   */
  @Delete(':id')
  remove(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.expensesService.remove(shopId, id);
  }
}
