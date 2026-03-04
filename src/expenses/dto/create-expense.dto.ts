/**
 * @description DTO for recording a business expense.
 *
 * Expense types a bakkal typically tracks:
 *   "tedarikci"  — Supplier payment (wholesale goods purchase)
 *   "kira"       — Rent
 *   "elektrik"   — Electricity bill
 *   "su"         — Water bill
 *   "personel"   — Staff wages
 *   "diger"      — Other/miscellaneous
 *
 * Example: Paying the bread supplier:
 * {
 *   "vendorName": "Halk Fırını",
 *   "itemAmount": 500.00,
 *   "expenseType": "tedarikci",
 *   "transactionDate": "2026-02-12"
 * }
 */
export class CreateExpenseDto {
  /** Name of vendor, supplier or payee */
  vendorName: string;

  /** Amount paid in TL */
  itemAmount: number;

  /** Category of expense (tedarikci, kira, elektrik, etc.) */
  expenseType: string;

  /** Date of the expense in "YYYY-MM-DD" format. Defaults to today. */
  transactionDate?: string;
}
