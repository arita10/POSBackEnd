/**
 * Expense types:
 *   "kasa_gider"  — Cash expense paid from register (rent, electricity, etc.)
 *   "devir_gider" — Carry-over deduction (reduces devir balance day-by-day)
 *   "kart_gider"  — Card/bank expense (not from cash register)
 */
export class CreateExpenseDto {
  vendorName: string;
  vendorId?: number;
  itemAmount: number;
  expenseType: string; // 'kasa_gider' | 'devir_gider' | 'kart_gider'
  transactionDate?: string; // "YYYY-MM-DD", defaults to today
}
