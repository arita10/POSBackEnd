/**
 * CloseDayDto — owner submits this when closing the day.
 *
 * dunDevir       = previous day carry balance (entered manually by owner)
 * kasaNakit      = physical cash counted in register
 * krediler       = credits given today (müşteri kredisi)
 * verisiye       = outstanding debt collected today
 */
export class CloseDayDto {
  recordDate: string;      // "YYYY-MM-DD"
  dunDevir: number;        // Owner enters previous day's carry balance
  kasaNakit: number;
  krediler: number;
  verisiye: number;
}
