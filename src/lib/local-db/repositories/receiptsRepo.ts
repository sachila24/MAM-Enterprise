import type { Customer, Payment } from '../../../types/entities';
import { getDb } from '../localDb';
import { mapLegacyPayment } from '../mappers';
import type { MamDemoDb } from '../types';
import { listCustomers } from './customersRepo';

export type ReceiptRow = Payment & { customer?: Customer };

export function listReceipts(db: MamDemoDb = getDb()): ReceiptRow[] {
  const customers = listCustomers(db);
  return db.receipts.map((r) => {
    const payment = db.loan_payments.find((p) => p.id === r.payment_id);
    const customer = customers.find((c) => c.id === r.customer_id);
    if (!payment) {
      return {
        id: r.id,
        loanId: r.loan_id,
        receiptNo: r.receipt_number,
        amount: r.amount,
        method: 'CASH' as const,
        status: 'confirmed' as const,
        paidAt: r.issued_at,
        customer,
      };
    }
    return { ...mapLegacyPayment(payment), customer };
  });
}
