/**
 * @description DTO for updating an existing expense record.
 * All fields are optional.
 */
export class UpdateExpenseDto {
  vendorName?: string;
  itemAmount?: number;
  expenseType?: string;
  transactionDate?: string;
}
