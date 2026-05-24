import {
  calculateFixedInstallmentTotals,
  buildFixedInstallmentSchedule,
  calculateLateFeeAmount,
} from '../finance/fixedInstallment';
import { addMonthsSameDay, computeFirstDueDate } from '../finance/dueDates';
import { DEFAULT_LATE_FEE_RATE_PERCENT } from '../finance/constants';
import { roundLKR } from '../finance/money';
import type { MamDemoDb } from './types';
import {
  getSystemTimestamp,
  getSystemToday,
  isDateBefore,
} from '../time/systemTime';

const now = () => getSystemTimestamp();

function nextMonth15(): string {
  const d = new Date();
  const day = 15;
  if (d.getDate() > day) d.setMonth(d.getMonth() + 1);
  d.setDate(day);
  return d.toISOString().split('T')[0];
}

export function buildSeedDatabase(): MamDemoDb {
  const ts = now();
  const profileId = 'profile-owner-1';
  const c1 = 'cust-00001';
  const c2 = 'cust-00002';
  const c3 = 'cust-00003';
  const b1 = 'bike-00001';
  const b2 = 'bike-00002';
  const b3 = 'bike-00003';
  const b4 = 'bike-00004';
  const loanIo = 'loan-io-0001';
  const loanFix = 'loan-fix-0001';
  const loanFix2 = 'loan-fix-0002';
  const loanBike = 'loan-bike-0001';

  const ioStart = '2026-02-01';
  const ioFirstDue = computeFirstDueDate(ioStart);
  const ioPrincipal = 200_000;
  const ioRate = 5;

  const fixTotals = calculateFixedInstallmentTotals({
    financeAmount: 300_000,
    termMonths: 36,
    monthlyFlatRatePercent: 2.5,
  });
  const fixSchedule = buildFixedInstallmentSchedule(fixTotals, '2025-12-01');
  const fixStart = '2025-11-01';
  const asOf = getSystemToday();

  const bikeFinance = 320_000;
  const bikeTotals = calculateFixedInstallmentTotals({
    financeAmount: bikeFinance,
    termMonths: 24,
    monthlyFlatRatePercent: 3,
  });
  const bikeSchedule = buildFixedInstallmentSchedule(bikeTotals, '2026-05-01');

  const installmentsFix: MamDemoDb['loan_installments'] = fixSchedule.map(
    (line) => {
      const num = line.installmentNumber;
      let paid = 0;
      const lateFeePaid = 0;
      let lateFeeAmount = 0;
      let status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' = 'PENDING';

      if (num === 1) {
        paid = Math.round(line.installmentAmount * 0.5);
        status = 'PARTIAL';
      } else if (num === 2 || num === 3) {
        const monthsLate = num === 2 ? 2 : 1;
        lateFeeAmount = calculateLateFeeAmount({
          installmentAmount: line.installmentAmount,
          lateFeeRatePercent: DEFAULT_LATE_FEE_RATE_PERCENT,
          monthsLate,
        });
        status = 'OVERDUE';
      } else if (isDateBefore(line.dueDate, asOf)) {
        status = 'OVERDUE';
      }

      return {
        id: `inst-fix-${num}`,
        loan_id: loanFix,
        installment_number: num,
        due_date: line.dueDate,
        principal_component: line.principalComponent,
        interest_component: line.interestComponent,
        installment_amount: line.installmentAmount,
        paid_amount: paid,
        late_fee_amount: lateFeeAmount,
        late_fee_paid: lateFeePaid,
        status,
        paid_at: status === 'PAID' ? '2025-12-05' : undefined,
        created_at: ts,
        updated_at: ts,
      };
    }
  );

  const installmentsBike: MamDemoDb['loan_installments'] = bikeSchedule.map(
    (line) => ({
      id: `inst-bike-${line.installmentNumber}`,
      loan_id: loanBike,
      installment_number: line.installmentNumber,
      due_date: line.dueDate,
      principal_component: line.principalComponent,
      interest_component: line.interestComponent,
      installment_amount: line.installmentAmount,
      paid_amount: 0,
      late_fee_amount: 0,
      late_fee_paid: 0,
      status: 'PENDING' as const,
      created_at: ts,
      updated_at: ts,
    })
  );

  const fix2Installment = 26_389;
  const fix2Term = 12;
  const fix2FirstDue = '2026-02-02';
  const fix2TotalPayable = fix2Installment * fix2Term;
  const installmentsFix2: MamDemoDb['loan_installments'] = Array.from(
    { length: fix2Term },
    (_, i) => {
      const num = i + 1;
      const dueDate = addMonthsSameDay(fix2FirstDue, i);
      const pastDue = isDateBefore(dueDate, asOf);
      return {
        id: `inst-fix2-${num}`,
        loan_id: loanFix2,
        installment_number: num,
        due_date: dueDate,
        principal_component: roundLKR(fix2Installment * 0.7),
        interest_component: roundLKR(fix2Installment * 0.3),
        installment_amount: fix2Installment,
        paid_amount: 0,
        late_fee_amount: 0,
        late_fee_paid: 0,
        status: pastDue ? ('OVERDUE' as const) : ('PENDING' as const),
        created_at: ts,
        updated_at: ts,
      };
    }
  );

  const payFixId = 'pay-fix-001';
  const payFixAmount = 15_834;

  const db: MamDemoDb = {
    version: 1,
    profiles: [
      {
        id: profileId,
        full_name: 'Sachila',
        email: 'sachila@mamtrading.lk',
        role: 'OWNER',
        active: true,
        created_at: ts,
      },
    ],
    customers: [
      // {
      //   id: c1,
      //   customer_code: 'CUS-00001',
      //   full_name: 'Kamal Perera',
      //   phone: '0771234567',
      //   address: 'Colombo 07',
      //   nic: '199012345678',
      //   status: 'ACTIVE',
      //   created_at: ts,
      //   updated_at: ts,
      // },
      // {
      //   id: c2,
      //   customer_code: 'CUS-00002',
      //   full_name: 'Nimal Silva',
      //   phone: '0712223333',
      //   address: 'Kandy',
      //   nic: '198512345678',
      //   status: 'ACTIVE',
      //   created_at: ts,
      //   updated_at: ts,
      // },
      // {
      //   id: c3,
      //   customer_code: 'CUS-00003',
      //   full_name: 'Saman Kumara',
      //   phone: '0758889999',
      //   address: 'Galle',
      //   nic: '199512345678',
      //   status: 'ACTIVE',
      //   created_at: ts,
      //   updated_at: ts,
      // },
    ],
    bikes: [
      // {
      //   id: b1,
      //   bike_code: 'BIK-00001',
      //   model: 'Bajaj Discovery',
      //   chassis_no: 'CH-ABC-1234',
      //   engine_no: 'EN-ABC-1234',
      //   color: 'Black',
      //   year: 2024,
      //   cost_price: 500_000,
      //   selling_price: 580_000,
      //   status: 'IN_STOCK',
      //   purchase_date: '2025-06-01',
      //   created_at: ts,
      //   updated_at: ts,
      // },
      // {
      //   id: b2,
      //   bike_code: 'BIK-00002',
      //   model: 'Honda Dio',
      //   chassis_no: 'WP-7788-CH',
      //   engine_no: 'WP-7788-EN',
      //   color: 'Red',
      //   year: 2023,
      //   cost_price: 420_000,
      //   selling_price: 520_000,
      //   status: 'SOLD',
      //   purchase_date: '2025-03-01',
      //   sold_date: ts,
      //   sold_loan_id: loanBike,
      //   created_at: ts,
      //   updated_at: ts,
      // },
      // {
      //   id: b3,
      //   bike_code: 'BIK-00003',
      //   model: 'TVS Apache',
      //   registration_no: 'CAB-3456',
      //   chassis_no: 'TVS-9999',
      //   engine_no: 'TVS-8888',
      //   color: 'Blue',
      //   year: 2022,
      //   cost_price: 650_000,
      //   selling_price: 730_000,
      //   status: 'IN_STOCK',
      //   repair_cost: 15_000,
      //   other_cost: 5_000,
      //   purchase_date: '2024-01-01',
      //   created_at: ts,
      //   updated_at: ts,
      // },
      // {
      //   id: b4,
      //   bike_code: 'BIK-00004',
      //   model: 'Yamaha FZ',
      //   registration_no: 'CAB-7890',
      //   chassis_no: 'YAM-1111',
      //   engine_no: 'YAM-2222',
      //   color: 'White',
      //   year: 2023,
      //   cost_price: 480_000,
      //   selling_price: 560_000,
      //   status: 'SOLD',
      //   sold_price: 550_000,
      //   repair_cost: 10_000,
      //   other_cost: 0,
      //   purchase_date: '2024-06-01',
      //   sold_date: '2025-09-15',
      //   created_at: ts,
      //   updated_at: ts,
      // },
    ],
    loans: [
      // {
      //   id: loanIo,
      //   loan_code: 'LN-IO-0001',
      //   loan_purpose: 'CASH_LOAN',
      //   repayment_method: 'INTEREST_ONLY_REDUCING_PRINCIPAL',
      //   customer_id: c1,
      //   principal_amount: ioPrincipal,
      //   original_principal_amount: ioPrincipal,
      //   current_principal_balance: ioPrincipal,
      //   interest_rate: ioRate,
      //   interest_rate_period: 'MONTHLY',
      //   interest_calculation_type: 'REDUCING_PRINCIPAL',
      //   discount_amount: 0,
      //   paid_amount: 0,
      //   balance_amount: ioPrincipal,
      //   late_fee_rate: 0,
      //   start_date: ioStart,
      //   first_due_date: ioFirstDue,
      //   due_day: 15,
      //   due_date: nextMonth15(),
      //   minimum_months_before_settlement: 6,
      //   status: 'ACTIVE',
      //   pending_interest_amount: 0,
      //   created_at: ts,
      //   updated_at: ts,
      // },
      // {
      //   id: loanFix,
      //   loan_code: 'LN-FIX-0001',
      //   loan_purpose: 'CASH_LOAN',
      //   repayment_method: 'FIXED_TERM_INSTALLMENT',
      //   customer_id: c2,
      //   principal_amount: 300_000,
      //   original_principal_amount: 300_000,
      //   current_principal_balance: 300_000,
      //   interest_rate: 2.5,
      //   interest_rate_period: 'MONTHLY',
      //   interest_calculation_type: 'FLAT_TERM',
      //   term_months: 36,
      //   total_interest_amount: fixTotals.totalInterest,
      //   total_before_discount: fixTotals.totalBeforeDiscount,
      //   discount_amount: 0,
      //   total_payable: fixTotals.totalPayable,
      //   paid_amount: payFixAmount,
      //   balance_amount: fixTotals.totalPayable - payFixAmount,
      //   installment_amount: fixTotals.monthlyInstallment,
      //   late_fee_rate: DEFAULT_LATE_FEE_RATE_PERCENT,
      //   start_date: fixStart,
      //   first_due_date: '2025-12-01',
      //   due_date: '2026-04-01',
      //   minimum_months_before_settlement: 6,
      //   status: 'OVERDUE',
      //   pending_interest_amount: 0,
      //   created_at: ts,
      //   updated_at: ts,
      // },
      // {
      //   id: loanFix2,
      //   loan_code: 'LN-FIX-0002',
      //   loan_purpose: 'CASH_LOAN',
      //   repayment_method: 'FIXED_TERM_INSTALLMENT',
      //   customer_id: c2,
      //   principal_amount: 250_000,
      //   original_principal_amount: 250_000,
      //   current_principal_balance: 250_000,
      //   interest_rate: 5,
      //   interest_rate_period: 'MONTHLY',
      //   interest_calculation_type: 'FLAT_TERM',
      //   term_months: fix2Term,
      //   total_interest_amount: fix2TotalPayable - 250_000,
      //   total_before_discount: fix2TotalPayable,
      //   discount_amount: 0,
      //   total_payable: fix2TotalPayable,
      //   paid_amount: 0,
      //   balance_amount: fix2TotalPayable,
      //   installment_amount: fix2Installment,
      //   late_fee_rate: DEFAULT_LATE_FEE_RATE_PERCENT,
      //   start_date: '2026-01-02',
      //   first_due_date: fix2FirstDue,
      //   due_date: addMonthsSameDay(fix2FirstDue, 3),
      //   minimum_months_before_settlement: 6,
      //   status: 'OVERDUE',
      //   pending_interest_amount: 0,
      //   notes: 'Demo: 4 overdue installments with boundary-based late fees',
      //   created_at: ts,
      //   updated_at: ts,
      // },
      // {
      //   id: loanBike,
      //   loan_code: 'LN-BIKE-0001',
      //   loan_purpose: 'BIKE_INSTALLMENT',
      //   repayment_method: 'FIXED_TERM_INSTALLMENT',
      //   customer_id: c3,
      //   bike_id: b2,
      //   principal_amount: bikeFinance,
      //   original_principal_amount: bikeFinance,
      //   current_principal_balance: bikeFinance,
      //   interest_rate: 3,
      //   interest_rate_period: 'MONTHLY',
      //   interest_calculation_type: 'FLAT_TERM',
      //   term_months: 24,
      //   total_interest_amount: bikeTotals.totalInterest,
      //   total_before_discount: bikeTotals.totalBeforeDiscount,
      //   discount_amount: 0,
      //   total_payable: bikeTotals.totalPayable,
      //   paid_amount: 0,
      //   balance_amount: bikeTotals.totalPayable,
      //   installment_amount: bikeTotals.monthlyInstallment,
      //   late_fee_rate: DEFAULT_LATE_FEE_RATE_PERCENT,
      //   start_date: '2026-05-01',
      //   first_due_date: '2026-06-01',
      //   due_date: '2026-06-01',
      //   minimum_months_before_settlement: 6,
      //   status: 'ACTIVE',
      //   pending_interest_amount: 0,
      //   notes: 'Selling price LKR 520,000 · Down payment LKR 200,000',
      //   created_at: ts,
      //   updated_at: ts,
      // },
    ],
    loan_installments: [
      ...installmentsFix,
      ...installmentsFix2,
      ...installmentsBike,
    ],
    loan_interest_cycles: [],
    loan_payments: [
      // {
      //   id: payFixId,
      //   payment_code: 'PAY-00001',
      //   loan_id: loanFix,
      //   customer_id: c2,
      //   amount: payFixAmount,
      //   discount_amount: 0,
      //   applied_amount: payFixAmount,
      //   payment_method: 'CASH',
      //   payment_date: '2025-12-05',
      //   receipt_number: 'RCP-00001',
      //   status: 'CONFIRMED',
      //   created_at: ts,
      //   updated_at: ts,
      // },
    ],
    payment_allocations: [
      // {
      //   id: 'alloc-fix-1',
      //   payment_id: payFixId,
      //   loan_id: loanFix,
      //   allocation_type: 'INSTALLMENT',
      //   installment_id: 'inst-fix-1',
      //   amount: payFixAmount,
      //   created_at: ts,
      // },
    ],
    early_settlements: [],
    guarantees: [
      // {
      //   id: 'gua-00001',
      //   guarantee_code: 'GUA-00001',
      //   loan_id: loanIo,
      //   customer_id: c1,
      //   item_type: 'VEHICLE_BOOK',
      //   description: 'Vehicle book — WP-CAB-1234',
      //   storage_location: 'Office safe',
      //   status: 'HELD',
      //   received_at: ts,
      //   created_at: ts,
      // },
      // {
      //   id: 'gua-00002',
      //   guarantee_code: 'GUA-00002',
      //   loan_id: loanFix,
      //   customer_id: c2,
      //   item_type: 'VEHICLE_BOOK',
      //   item_reference: 'WP-KA-7788',
      //   owner_name_on_document: 'Nimal Silva',
      //   description: 'Vehicle book — Kandy registration',
      //   storage_location: 'Office safe',
      //   status: 'HELD',
      //   received_at: ts,
      //   created_at: ts,
      // },
      // {
      //   id: 'gua-00003',
      //   guarantee_code: 'GUA-00003',
      //   loan_id: loanBike,
      //   customer_id: c3,
      //   item_type: 'OTHER',
      //   item_reference: 'NIC copy + bill set',
      //   owner_name_on_document: 'Saman Kumara',
      //   description: 'Additional documents bundle',
      //   storage_location: 'Filing cabinet A',
      //   status: 'HELD',
      //   received_at: ts,
      //   created_at: ts,
      // },
      // {
      //   id: 'gua-00004',
      //   guarantee_code: 'GUA-00004',
      //   loan_id: loanIo,
      //   customer_id: c1,
      //   item_type: 'GOLD',
      //   description: 'Gold pledge — returned after partial settlement (demo)',
      //   storage_location: 'Vault',
      //   status: 'RELEASED',
      //   received_at: '2025-06-01T00:00:00Z',
      //   released_at: '2026-03-01T00:00:00Z',
      //   released_to: 'Kamal Perera (customer pickup)',
      //   created_at: ts,
      // },
    ],
    documents: [],
    receipts: [
      // {
      //   id: 'rcp-00001',
      //   receipt_number: 'RCP-00001',
      //   payment_id: payFixId,
      //   loan_id: loanFix,
      //   customer_id: c2,
      //   amount: payFixAmount,
      //   issued_at: '2025-12-05',
      //   breakdown: {
      //     lateFeePaid: 0,
      //     installmentPaid: payFixAmount,
      //     remainingArrears: fixTotals.totalPayable - payFixAmount,
      //     loanBalance: fixTotals.totalPayable - payFixAmount,
      //   },
      //   created_at: ts,
      // },
    ],
    expenses: [
      // {
      //   id: 'exp-00001',
      //   expense_code: 'EXP-00001',
      //   category: 'RENT',
      //   amount: 45_000,
      //   expense_date: '2026-05-01',
      //   notes: 'Shop rent May',
      //   created_at: ts,
      // },
      // {
      //   id: 'exp-00002',
      //   expense_code: 'EXP-00002',
      //   category: 'UTILITIES',
      //   amount: 8_500,
      //   expense_date: '2026-05-10',
      //   notes: 'Electricity',
      //   created_at: ts,
      // },
    ],
    audit_logs: [
      // {
      //   id: 'log-1',
      //   user_id: profileId,
      //   action: 'SEED',
      //   entity_type: 'system',
      //   entity_id: 'demo',
      //   summary: 'Demo database seeded',
      //   created_at: ts,
      // },
      // {
      //   id: 'log-2',
      //   user_id: profileId,
      //   action: 'PAYMENT',
      //   entity_type: 'payment',
      //   entity_id: payFixId,
      //   summary: 'Payment PAY-00001 recorded for LN-FIX-0001',
      //   created_at: ts,
      // },
    ],
    counters: {
      CUS: 3,
      BIK: 4,
      LN: 4,
      PAY: 1,
      RCP: 1,
      GUA: 4,
      EXP: 2,
    },
  };

  return db;
}
