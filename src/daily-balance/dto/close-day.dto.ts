/**
 * @description DTO for closing the daily balance (Gün Sonu Kapanış).
 *
 * The owner fills these three fields by physically counting:
 *
 *   cashCountManual   → Count notes and coins in the cash drawer
 *   creditCountManual → Total credit given to customers today
 *                       (e.g. neighbour took bread, will pay later)
 *   debtCountManual   → Total debt collected from customers today
 *                       (e.g. collected last week's credit)
 *
 * The system auto-fetches:
 *   - totalSystemSelling (from sales_transactions for today)
 *   - totalExpenseSum    (from expense_items for today)
 *   - yesterdayBalance   (from previous day's incomeLeft)
 *
 * Then calculates:
 *   incomeLeft = totalSystemSelling - totalExpenseSum + yesterdayBalance
 *   difference = (cashCountManual + creditCountManual + debtCountManual) - incomeLeft
 *
 * Example close-day request:
 * {
 *   "recordDate": "2026-02-20",
 *   "cashCountManual": 200.00,
 *   "creditCountManual": 100.00,
 *   "debtCountManual": 50.00
 * }
 */
export class CloseDayDto {
  /** The date being closed, format: "YYYY-MM-DD" */
  recordDate: string;

  /** Physical cash counted in the drawer (banknotes + coins) */
  cashCountManual: number;

  /** Total credit extended to customers today (will be paid later) */
  creditCountManual: number;

  /** Total debt collected from customers today (previous credit paid back) */
  debtCountManual: number;
}
