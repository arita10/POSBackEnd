export class CreatePaymentDto {
  customerId: number;
  amount: number;
  note?: string;
  recordedBy: number;
  paymentDate?: string; // YYYY-MM-DD, defaults to today
}
