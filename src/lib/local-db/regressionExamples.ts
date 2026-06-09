/**
 * Regression examples for purchase date, bike lifecycle, and early settlement flows.
 * Run `verifyRegressionExamples()` in dev to assert.
 */

import {
  earlySettlementPaymentNote,
  parseEarlySettlementPaymentNote,
} from '../finance/earlySettlement';
import { normalizeDate, toDateInputValue } from '../time/systemTime';
import { normalizeRegistrationNumber } from '../validation/registrationNumber';
import type { MamDemoDb } from './types';
import {
  createBike,
  completeBikePurchase,
  completeCashSale,
  hasSoldBikeHistoryForRegistration,
  isBikeActiveInventory,
  isRegistrationUsedByActiveBike,
} from './repositories/bikesRepo';
import { createLoan } from './repositories/loansRepo';
import { confirmEarlySettlement } from './repositories/earlySettlementRepo';

const TS = '2026-01-15T10:00:00.000Z';

function emptyDb(): MamDemoDb {
  return {
    version: 1,
    profiles: [
      {
        id: 'profile-1',
        full_name: 'Test Staff',
        role: 'STAFF',
        active: true,
        created_at: TS,
      },
    ],
    customers: [
      {
        id: 'cust-1',
        customer_code: 'CUS-0001',
        full_name: 'Test Customer',
        phone: '0771234567',
        address: 'Colombo',
        nic: '123456789V',
        status: 'ACTIVE',
        created_at: TS,
        updated_at: TS,
      },
    ],
    bikes: [],
    loans: [],
    loan_installments: [],
    loan_interest_cycles: [],
    loan_payments: [],
    payment_allocations: [],
    early_settlements: [],
    guarantees: [],
    receipts: [],
    documents: [],
    expenses: [],
    cash_transactions: [],
    audit_logs: [],
    business_settings: {
      business_name: 'MAM Trading',
      registration_number: '',
      address: 'Test',
      contact_phone: '0710000000',
      default_currency: 'LKR',
      default_language: 'EN',
      receipt_footer_note: '',
      staff_activity_log_access: true,
      updated_at: TS,
    },
    app_auth: {
      pin_hash: '',
      updated_at: TS,
    },
    counters: {},
  };
}

function seedSoldBikeScenario(): {
  db: MamDemoDb;
  soldBikeId: string;
  loanId: string;
} {
  const db = emptyDb();
  const soldBikeId = 'bike-sold-1';
  const loanId = 'loan-1';

  db.bikes.push({
    id: soldBikeId,
    bike_code: 'BIK-0001',
    model: 'Honda CB125',
    registration_no: 'CAB-1234',
    chassis_no: 'CHS-001',
    engine_no: 'ENG-001',
    color: 'Red',
    year: 2022,
    cost_price: 200_000,
    selling_price: 280_000,
    status: 'SOLD',
    purchase_date: '2025-06-01',
    sold_date: '2025-07-01',
    sold_price: 280_000,
    sold_loan_id: loanId,
    created_at: TS,
    updated_at: TS,
  });

  db.loans.push({
    id: loanId,
    loan_code: 'LN-BIKE-0001',
    loan_purpose: 'BIKE_INSTALLMENT',
    repayment_method: 'FIXED_TERM_INSTALLMENT',
    customer_id: 'cust-1',
    bike_id: soldBikeId,
    principal_amount: 250_000,
    original_principal_amount: 280_000,
    current_principal_balance: 250_000,
    interest_rate: 2.5,
    interest_rate_period: 'MONTHLY',
    interest_calculation_type: 'FLAT_TERM',
    term_months: 36,
    total_interest_amount: 225_000,
    total_before_discount: 475_000,
    discount_amount: 0,
    total_payable: 475_000,
    paid_amount: 79_170,
    balance_amount: 395_830,
    installment_amount: 13_195,
    late_fee_rate: 5,
    start_date: '2025-07-01',
    first_due_date: '2025-08-01',
    due_date: '2025-08-01',
    minimum_months_before_settlement: 6,
    status: 'ACTIVE',
    pending_interest_amount: 0,
    service_fee: 0,
    registration_fee: 0,
    customer_paid_amount: 30_000,
    advance_payment: 30_000,
    created_at: TS,
    updated_at: TS,
  });

  for (let n = 1; n <= 36; n += 1) {
    const monthNorm = n + 7 > 12 ? n + 7 - 12 : n + 7;
    const year = n + 7 > 12 ? 2026 : 2025;
    db.loan_installments.push({
      id: `inst-${n}`,
      loan_id: loanId,
      installment_number: n,
      due_date: `${year}-${String(monthNorm).padStart(2, '0')}-01`,
      principal_component: 6944,
      interest_component: 6251,
      installment_amount: 13_195,
      paid_amount: n <= 6 ? 13_195 : 0,
      late_fee_amount: 0,
      late_fee_paid: 0,
      status: n <= 6 ? 'PAID' : 'PENDING',
      paid_at: n <= 6 ? `${year}-${String(monthNorm).padStart(2, '0')}-01` : undefined,
      created_at: TS,
      updated_at: TS,
    });
  }

  return { db, soldBikeId, loanId };
}

export const REGRESSION_BIKE_READD = (() => {
  const { db, soldBikeId, loanId } = seedSoldBikeScenario();
  const registration = 'CAB-1234';
  const blockedWhileActive = isRegistrationUsedByActiveBike(db, registration);
  const hasHistory = hasSoldBikeHistoryForRegistration(db, registration);
  const newBike = createBike(
    {
      model: 'Honda CB125 Re-acquired',
      registrationNo: registration,
      chassisNo: 'CHS-002',
      costPrice: 180_000,
      sellingPrice: 260_000,
      purchaseDate: '2026-06-01',
    },
    db
  );
  const soldRow = db.bikes.find((b) => b.id === soldBikeId);
  const loanRow = db.loans.find((l) => l.id === loanId);
  return {
    blockedWhileActive,
    hasHistory,
    newBikeId: newBike.id,
    soldBikePreserved: soldRow?.status === 'SOLD',
    loanStillPointsToOriginal: loanRow?.bike_id === soldBikeId,
    newBikeDistinct: newBike.id !== soldBikeId,
  };
})();

/** create → loan sell → re-add with same registration (real repo flow). */
export const REGRESSION_BIKE_SELL_THEN_READD = (() => {
  const db = emptyDb();
  const registration = 'WP-CAB-7777';

  const firstBike = createBike(
    {
      model: 'Yamaha FZ',
      registrationNo: registration,
      chassisNo: 'CHS-ORIG-1',
      costPrice: 200_000,
      sellingPrice: 280_000,
      purchaseDate: '2026-01-01',
    },
    db
  );

  const loan = createLoan(
    {
      customerId: 'cust-1',
      loanPurpose: 'BIKE_INSTALLMENT',
      repaymentMethod: 'FIXED_TERM_INSTALLMENT',
      principalAmount: 280_000,
      interestRate: 2.5,
      termMonths: 36,
      lateFeeRate: 5,
      discountAmount: 0,
      startDate: '2026-02-01',
      firstDueDate: '2026-03-01',
      bikeId: firstBike.id,
    },
    db
  );

  const soldRow = db.bikes.find((b) => b.id === firstBike.id);
  let readdError: string | null = null;
  let secondBikeId: string | null = null;

  try {
    const secondBike = createBike(
      {
        model: 'Yamaha FZ (returned)',
        registrationNo: registration,
        chassisNo: 'CHS-RETURN-2',
        costPrice: 190_000,
        sellingPrice: 270_000,
        purchaseDate: '2026-06-01',
      },
      db
    );
    secondBikeId = secondBike.id;
  } catch (err) {
    readdError = err instanceof Error ? err.message : String(err);
  }

  const loanRow = db.loans.find((l) => l.id === loan.id);

  return {
    firstBikeId: firstBike.id,
    loanId: loan.id,
    soldStatus: soldRow?.status,
    soldLoanId: soldRow?.sold_loan_id,
    readdError,
    secondBikeId,
    loanStillPointsToOriginal: loanRow?.bike_id === firstBike.id,
    secondBikeDistinct: secondBikeId != null && secondBikeId !== firstBike.id,
  };
})();

/** Duplicate registration on active stock is allowed (no blocking). */
export const REGRESSION_ACTIVE_STOCK_ALLOWS_DUPLICATE = (() => {
  const db = emptyDb();
  db.bikes.push({
    id: 'bike-active-bgz',
    bike_code: 'BIK-ACTIVE',
    model: 'Active Bike',
    registration_no: 'BGZ-0602',
    chassis_no: 'CHS-ACT',
    engine_no: 'ENG-ACT',
    color: 'Red',
    year: 2020,
    cost_price: 150_000,
    selling_price: 220_000,
    status: 'IN_STOCK',
    purchase_date: '2026-01-01',
    created_at: TS,
    updated_at: TS,
  });

  let createError: string | null = null;
  let secondId: string | null = null;
  try {
    secondId = createBike(
      {
        model: 'Duplicate attempt',
        registrationNo: 'BGZ 0602',
        chassisNo: 'CHS-NEW',
        costPrice: 140_000,
        sellingPrice: 210_000,
        purchaseDate: '2026-06-01',
      },
      db
    ).id;
  } catch (err) {
    createError = err instanceof Error ? err.message : String(err);
  }

  return { createError, secondId, bikeCount: db.bikes.length };
})();

/** Sold "BGZ-0602" must not block new bike entered as "BGZ 0602" (format-normalized match). */
export const REGRESSION_BIKE_FUZZY_REG_FORMAT = (() => {
  const db = emptyDb();
  const soldBikeId = 'bike-bgz-sold';
  const loanId = 'loan-bgz';

  db.bikes.push({
    id: soldBikeId,
    bike_code: 'BIK-BGZ-OLD',
    model: 'Bajaj CT100',
    registration_no: 'BGZ-0602',
    chassis_no: 'CHS-BGZ-OLD',
    engine_no: 'ENG-BGZ',
    color: 'Black',
    year: 2019,
    cost_price: 120_000,
    selling_price: 180_000,
    status: 'SOLD',
    sold_date: '2025-11-01',
    sold_price: 175_000,
    sold_loan_id: loanId,
    purchase_date: '2025-06-01',
    created_at: TS,
    updated_at: TS,
  });

  db.loans.push({
    id: loanId,
    loan_code: 'LN-BIKE-BGZ',
    loan_purpose: 'BIKE_INSTALLMENT',
    repayment_method: 'FIXED_TERM_INSTALLMENT',
    customer_id: 'cust-1',
    bike_id: soldBikeId,
    principal_amount: 160_000,
    original_principal_amount: 180_000,
    current_principal_balance: 160_000,
    interest_rate: 2.5,
    interest_rate_period: 'MONTHLY',
    interest_calculation_type: 'FLAT_TERM',
    term_months: 24,
    total_interest_amount: 96_000,
    total_before_discount: 256_000,
    discount_amount: 0,
    total_payable: 256_000,
    paid_amount: 0,
    balance_amount: 256_000,
    installment_amount: 10_667,
    late_fee_rate: 5,
    start_date: '2025-12-01',
    first_due_date: '2026-01-01',
    due_date: '2026-01-01',
    minimum_months_before_settlement: 6,
    status: 'ACTIVE',
    pending_interest_amount: 0,
    service_fee: 0,
    registration_fee: 0,
    customer_paid_amount: 20_000,
    advance_payment: 20_000,
    created_at: TS,
    updated_at: TS,
  });

  const newRegInput = 'BGZ 0602';
  const normDash = normalizeRegistrationNumber('BGZ-0602');
  const normSpace = normalizeRegistrationNumber('BGZ 0602');
  const normPlain = normalizeRegistrationNumber('BGZ0602');
  const blockedWhileActive = isRegistrationUsedByActiveBike(db, newRegInput);
  const hasHistory = hasSoldBikeHistoryForRegistration(db, newRegInput);

  let addBikeError: string | null = null;
  let purchaseError: string | null = null;
  let addBikeId: string | null = null;

  try {
    const bike = createBike(
      {
        model: 'Bajaj CT100 (returned)',
        registrationNo: newRegInput,
        chassisNo: 'CHS-BGZ-NEW-1',
        costPrice: 100_000,
        sellingPrice: 170_000,
        purchaseDate: '2026-06-01',
      },
      db
    );
    addBikeId = bike.id;
  } catch (err) {
    addBikeError = err instanceof Error ? err.message : String(err);
  }

  const purchaseDb = emptyDb();
  purchaseDb.bikes.push({ ...db.bikes[0] });
  purchaseDb.loans.push({ ...db.loans[0] });

  try {
    completeBikePurchase(
      {
        model: 'Bajaj CT100 (purchase wizard)',
        registrationNo: newRegInput,
        chassisNo: 'CHS-BGZ-NEW-2',
        purchasePrice: 95_000,
        sellingPrice: 165_000,
        purchaseDate: '2026-06-02',
        paymentMethod: 'CASH',
        customerId: 'cust-1',
      },
      purchaseDb
    );
  } catch (err) {
    purchaseError = err instanceof Error ? err.message : String(err);
  }

  return {
    normDash,
    normSpace,
    normPlain,
    normsEqual: normDash === normSpace && normSpace === normPlain,
    blockedWhileActive,
    hasHistory,
    addBikeError,
    addBikeId,
    purchaseError,
    soldBikePreserved: db.bikes.find((b) => b.id === soldBikeId)?.status === 'SOLD',
  };
})();

/** Verify each sale path sets bike.status = SOLD and re-add works afterward. */
export const REGRESSION_SALE_FLOW_STATUS = (() => {
  const registration = 'SALE-FLOW-REG';

  const loanDb = emptyDb();
  const loanBike = createBike(
    {
      model: 'Loan Sale Bike',
      registrationNo: registration,
      chassisNo: 'CHS-LOAN',
      costPrice: 200_000,
      sellingPrice: 280_000,
      purchaseDate: '2026-01-01',
    },
    loanDb
  );
  const loan = createLoan(
    {
      customerId: 'cust-1',
      loanPurpose: 'BIKE_INSTALLMENT',
      repaymentMethod: 'FIXED_TERM_INSTALLMENT',
      principalAmount: 280_000,
      interestRate: 2.5,
      termMonths: 36,
      lateFeeRate: 5,
      discountAmount: 0,
      startDate: '2026-02-01',
      firstDueDate: '2026-03-01',
      bikeId: loanBike.id,
    },
    loanDb
  );
  const loanSoldRow = loanDb.bikes.find((b) => b.id === loanBike.id);

  let readdAfterLoanError: string | null = null;
  try {
    createBike(
      {
        model: 'Replacement after loan sale',
        registrationNo: registration,
        chassisNo: 'CHS-READD-LOAN',
        costPrice: 190_000,
        sellingPrice: 270_000,
        purchaseDate: '2026-06-01',
      },
      loanDb
    );
  } catch (err) {
    readdAfterLoanError = err instanceof Error ? err.message : String(err);
  }

  const cashDb = emptyDb();
  const cashBike = createBike(
    {
      model: 'Cash Sale Bike',
      registrationNo: 'CASH-SALE-REG',
      chassisNo: 'CHS-CASH',
      costPrice: 150_000,
      sellingPrice: 220_000,
      purchaseDate: '2026-01-01',
    },
    cashDb
  );
  completeCashSale(
    cashBike.id,
    {
      sellingPrice: 220_000,
      discountAmount: 0,
      additionalCharges: 0,
      paymentMethod: 'CASH',
      customer: { name: 'Buyer', phone: '0771234567' },
    },
    cashDb
  );
  const cashSoldRow = cashDb.bikes.find((b) => b.id === cashBike.id);

  const { db: settleDb, soldBikeId, loanId } = seedSoldBikeScenario();
  const bikeBeforeSettlement = settleDb.bikes.find((b) => b.id === soldBikeId)?.status;
  confirmEarlySettlement(
    {
      loanId,
      settlementDate: '2026-06-08',
      discountPercentage: 10,
      includeCurrentMonthDue: true,
    },
    settleDb
  );
  const bikeAfterSettlement = settleDb.bikes.find((b) => b.id === soldBikeId)?.status;

  return {
    loanSaleStatus: loanSoldRow?.status,
    loanSoldLoanId: loanSoldRow?.sold_loan_id,
    loanIdMatches: loanSoldRow?.sold_loan_id === loan.id,
    readdAfterLoanError,
    cashSaleStatus: cashSoldRow?.status,
    cashSoldDate: cashSoldRow?.sold_date,
    bikeBeforeSettlement,
    bikeAfterSettlement,
  };
})();

/** Scenario A: add → sell → re-add same registration (BGZ-0602). */
export const REGRESSION_SCENARIO_A = (() => {
  const db = emptyDb();
  const reg = 'BGZ-0602';
  const first = createBike(
    {
      model: 'Bajaj',
      registrationNo: reg,
      chassisNo: 'CHS-A-1',
      costPrice: 120_000,
      sellingPrice: 180_000,
      purchaseDate: '2026-01-01',
    },
    db
  );
  createLoan(
    {
      customerId: 'cust-1',
      loanPurpose: 'BIKE_INSTALLMENT',
      repaymentMethod: 'FIXED_TERM_INSTALLMENT',
      principalAmount: 180_000,
      interestRate: 2.5,
      termMonths: 24,
      lateFeeRate: 5,
      discountAmount: 0,
      startDate: '2026-02-01',
      firstDueDate: '2026-03-01',
      bikeId: first.id,
    },
    db
  );
  let readdError: string | null = null;
  let secondId: string | null = null;
  try {
    secondId = createBike(
      {
        model: 'Bajaj (returned)',
        registrationNo: reg,
        chassisNo: 'CHS-A-2',
        costPrice: 100_000,
        sellingPrice: 170_000,
        purchaseDate: '2026-06-01',
      },
      db
    ).id;
  } catch (err) {
    readdError = err instanceof Error ? err.message : String(err);
  }
  const loan = db.loans[0];
  return {
    readdError,
    secondId,
    firstStillSold: db.bikes.find((b) => b.id === first.id)?.status === 'SOLD',
    loanStillOriginal: loan?.bike_id === first.id,
  };
})();

/** Scenario B: BGZ 0602 sold → re-add as BGZ-0602. */
export const REGRESSION_SCENARIO_B = (() => {
  const db = emptyDb();
  const first = createBike(
    {
      model: 'Honda',
      registrationNo: 'BGZ 0602',
      chassisNo: 'CHS-B-1',
      costPrice: 130_000,
      sellingPrice: 190_000,
      purchaseDate: '2026-01-01',
    },
    db
  );
  createLoan(
    {
      customerId: 'cust-1',
      loanPurpose: 'BIKE_INSTALLMENT',
      repaymentMethod: 'FIXED_TERM_INSTALLMENT',
      principalAmount: 190_000,
      interestRate: 2.5,
      termMonths: 24,
      lateFeeRate: 5,
      discountAmount: 0,
      startDate: '2026-02-01',
      firstDueDate: '2026-03-01',
      bikeId: first.id,
    },
    db
  );
  let readdError: string | null = null;
  try {
    createBike(
      {
        model: 'Honda (re-acquired)',
        registrationNo: 'BGZ-0602',
        chassisNo: 'CHS-B-2',
        costPrice: 110_000,
        sellingPrice: 175_000,
        purchaseDate: '2026-06-01',
      },
      db
    );
  } catch (err) {
    readdError = err instanceof Error ? err.message : String(err);
  }
  return { readdError };
})();

/** Scenario B2: re-add same chassis after sell — must work. */
export const REGRESSION_SCENARIO_B_CHASSIS = (() => {
  const db = emptyDb();
  const chassis = 'CHS-REUSE-001';
  const first = createBike(
    {
      model: 'Yamaha',
      registrationNo: 'REG-CHS-A',
      chassisNo: chassis,
      costPrice: 140_000,
      sellingPrice: 200_000,
      purchaseDate: '2026-01-01',
    },
    db
  );
  createLoan(
    {
      customerId: 'cust-1',
      loanPurpose: 'BIKE_INSTALLMENT',
      repaymentMethod: 'FIXED_TERM_INSTALLMENT',
      principalAmount: 200_000,
      interestRate: 2.5,
      termMonths: 24,
      lateFeeRate: 5,
      discountAmount: 0,
      startDate: '2026-02-01',
      firstDueDate: '2026-03-01',
      bikeId: first.id,
    },
    db
  );
  let readdError: string | null = null;
  try {
    createBike(
      {
        model: 'Yamaha (returned)',
        registrationNo: 'REG-CHS-B',
        chassisNo: chassis,
        costPrice: 130_000,
        sellingPrice: 190_000,
        purchaseDate: '2026-06-01',
      },
      db
    );
  } catch (err) {
    readdError = err instanceof Error ? err.message : String(err);
  }
  return { readdError, loanStillOriginal: db.loans[0]?.bike_id === first.id };
})();

/** Scenario C: duplicate active registration allowed (no blocking). */
export const REGRESSION_SCENARIO_C = (() => {
  const db = emptyDb();
  createBike(
    {
      model: 'Active',
      registrationNo: 'BGZ-0602',
      chassisNo: 'CHS-C-1',
      costPrice: 140_000,
      sellingPrice: 200_000,
      purchaseDate: '2026-01-01',
    },
    db
  );
  let readdError: string | null = null;
  let secondId: string | null = null;
  try {
    secondId = createBike(
      {
        model: 'Duplicate',
        registrationNo: 'BGZ-0602',
        chassisNo: 'CHS-C-2',
        costPrice: 130_000,
        sellingPrice: 195_000,
        purchaseDate: '2026-06-01',
      },
      db
    ).id;
  } catch (err) {
    readdError = err instanceof Error ? err.message : String(err);
  }
  return { readdError, secondId, bikeCount: db.bikes.length };
})();

/**
 * Legacy corrupt row: status IN_STOCK but sold_loan_id set (old bug).
 * Re-add must still work without mutating the original bike id.
 */
export const REGRESSION_LEGACY_SOLD_STATUS_MISMATCH = (() => {
  const db = emptyDb();
  const soldBikeId = 'bike-legacy-sold';
  const loanId = 'loan-legacy';
  db.bikes.push({
    id: soldBikeId,
    bike_code: 'BIK-LEGACY',
    model: 'Legacy Sold',
    registration_no: 'LEG-9999',
    chassis_no: 'CHS-LEG-OLD',
    engine_no: 'ENG-LEG',
    color: 'Blue',
    year: 2020,
    cost_price: 100_000,
    selling_price: 150_000,
    status: 'IN_STOCK',
    sold_loan_id: loanId,
    sold_date: '2025-08-01',
    purchase_date: '2025-01-01',
    created_at: TS,
    updated_at: TS,
  });
  db.loans.push({
    id: loanId,
    loan_code: 'LN-LEGACY',
    loan_purpose: 'BIKE_INSTALLMENT',
    repayment_method: 'FIXED_TERM_INSTALLMENT',
    customer_id: 'cust-1',
    bike_id: soldBikeId,
    principal_amount: 140_000,
    original_principal_amount: 150_000,
    current_principal_balance: 140_000,
    interest_rate: 2.5,
    interest_rate_period: 'MONTHLY',
    interest_calculation_type: 'FLAT_TERM',
    term_months: 24,
    total_interest_amount: 84_000,
    total_before_discount: 224_000,
    discount_amount: 0,
    total_payable: 224_000,
    paid_amount: 50_000,
    balance_amount: 174_000,
    installment_amount: 9333,
    late_fee_rate: 5,
    start_date: '2025-08-01',
    first_due_date: '2025-09-01',
    due_date: '2025-09-01',
    minimum_months_before_settlement: 6,
    status: 'ACTIVE',
    pending_interest_amount: 0,
    service_fee: 0,
    registration_fee: 0,
    customer_paid_amount: 10_000,
    advance_payment: 10_000,
    created_at: TS,
    updated_at: TS,
  });

  const blockedBeforeReadd = isRegistrationUsedByActiveBike(db, 'LEG-9999');
  const legacyRow = db.bikes.find((b) => b.id === soldBikeId)!;
  const treatedInactive = !isBikeActiveInventory(legacyRow, db);

  let readdError: string | null = null;
  let newBikeId: string | null = null;
  try {
    newBikeId = createBike(
      {
        model: 'LEG-9999 returned',
        registrationNo: 'LEG-9999',
        chassisNo: 'CHS-LEG-NEW',
        costPrice: 90_000,
        sellingPrice: 140_000,
        purchaseDate: '2026-06-01',
      },
      db
    ).id;
  } catch (err) {
    readdError = err instanceof Error ? err.message : String(err);
  }

  return {
    blockedBeforeReadd,
    treatedInactive,
    originalIdPreserved: db.bikes.find((b) => b.id === soldBikeId)?.id === soldBikeId,
    loanStillOriginal: db.loans.find((l) => l.id === loanId)?.bike_id === soldBikeId,
    readdError,
    newBikeId,
  };
})();

export const REGRESSION_EARLY_SETTLEMENT_PAYMENT = (() => {
  const { db, loanId } = seedSoldBikeScenario();
  const result = confirmEarlySettlement(
    {
      loanId,
      settlementDate: '2026-06-08',
      discountPercentage: 10,
      includeCurrentMonthDue: true,
    },
    db
  );
  const payment = db.loan_payments.find((p) => p.id === result.paymentId);
  const allocations = db.payment_allocations.filter(
    (a) => a.payment_id === result.paymentId
  );
  const receipt = db.receipts.find((r) => r.payment_id === result.paymentId);
  const document = db.documents.find((d) => d.payment_id === result.paymentId);
  const settlement = db.early_settlements.find(
    (s) => s.settlement_code === result.settlementCode
  );
  const loan = db.loans.find((l) => l.id === loanId);
  return {
    settlementCode: result.settlementCode,
    receiptNumber: result.receiptNumber,
    paymentRecorded: Boolean(payment && payment.status === 'CONFIRMED'),
    allocationCount: allocations.length,
    receiptRecorded: Boolean(receipt),
    documentRecorded: document?.document_type === 'PAYMENT_RECEIPT',
    settlementLinkedToPayment: settlement?.payment_id === result.paymentId,
    loanSettled: loan?.status === 'SETTLED',
    paymentNote: payment?.notes,
  };
})();

export function verifyRegressionExamples(): Array<{
  name: string;
  pass: boolean;
  expected: unknown;
  actual: unknown;
}> {
  return [
    {
      name: 'Date input: yyyy-MM-dd string unchanged',
      pass: normalizeDate('2024-05-15') === '2024-05-15',
      expected: '2024-05-15',
      actual: normalizeDate('2024-05-15'),
    },
    {
      name: 'Date input: ISO datetime head',
      pass: normalizeDate('2024-05-15T10:00:00Z') === '2024-05-15',
      expected: '2024-05-15',
      actual: normalizeDate('2024-05-15T10:00:00Z'),
    },
    {
      name: 'Date input: Date object',
      pass:
        toDateInputValue(new Date('2024-05-15T12:00:00Z')) === '2024-05-15',
      expected: '2024-05-15',
      actual: toDateInputValue(new Date('2024-05-15T12:00:00Z')),
    },
    {
      name: 'Date input: invalid object never becomes [object Object]',
      pass: toDateInputValue({ target: { value: '2024-05-15' } }) === '',
      expected: '',
      actual: toDateInputValue({ target: { value: '2024-05-15' } }),
    },
    {
      name: 'Bike lifecycle: sold registration not active-blocked',
      pass: REGRESSION_BIKE_READD.blockedWhileActive === false,
      expected: false,
      actual: REGRESSION_BIKE_READD.blockedWhileActive,
    },
    {
      name: 'Bike lifecycle: sold history detected',
      pass: REGRESSION_BIKE_READD.hasHistory === true,
      expected: true,
      actual: REGRESSION_BIKE_READD.hasHistory,
    },
    {
      name: 'Bike lifecycle: re-add creates new inventory row',
      pass: REGRESSION_BIKE_READD.newBikeDistinct === true,
      expected: true,
      actual: REGRESSION_BIKE_READD.newBikeDistinct,
    },
    {
      name: 'Bike lifecycle: original sold record preserved',
      pass: REGRESSION_BIKE_READD.soldBikePreserved === true,
      expected: true,
      actual: REGRESSION_BIKE_READD.soldBikePreserved,
    },
    {
      name: 'Bike lifecycle: loan still references original bike',
      pass: REGRESSION_BIKE_READD.loanStillPointsToOriginal === true,
      expected: true,
      actual: REGRESSION_BIKE_READD.loanStillPointsToOriginal,
    },
    {
      name: 'Bike sell flow: first bike marked sold via loan',
      pass: REGRESSION_BIKE_SELL_THEN_READD.soldStatus === 'SOLD',
      expected: 'SOLD',
      actual: REGRESSION_BIKE_SELL_THEN_READD.soldStatus,
    },
    {
      name: 'Bike sell flow: re-add same registration succeeds',
      pass:
        REGRESSION_BIKE_SELL_THEN_READD.readdError === null &&
        REGRESSION_BIKE_SELL_THEN_READD.secondBikeDistinct === true,
      expected: { readdError: null, distinct: true },
      actual: {
        readdError: REGRESSION_BIKE_SELL_THEN_READD.readdError,
        secondBikeId: REGRESSION_BIKE_SELL_THEN_READD.secondBikeId,
      },
    },
    {
      name: 'Bike sell flow: loan still references original bike',
      pass: REGRESSION_BIKE_SELL_THEN_READD.loanStillPointsToOriginal === true,
      expected: true,
      actual: REGRESSION_BIKE_SELL_THEN_READD.loanStillPointsToOriginal,
    },
    {
      name: 'No blocking: duplicate reg on active stock allowed',
      pass: REGRESSION_ACTIVE_STOCK_ALLOWS_DUPLICATE.createError === null,
      expected: null,
      actual: REGRESSION_ACTIVE_STOCK_ALLOWS_DUPLICATE.createError,
    },
    {
      name: 'No blocking: duplicate reg creates second bike row',
      pass: REGRESSION_ACTIVE_STOCK_ALLOWS_DUPLICATE.bikeCount === 2,
      expected: 2,
      actual: REGRESSION_ACTIVE_STOCK_ALLOWS_DUPLICATE.bikeCount,
    },
    {
      name: 'Reg normalize: BGZ-0602 equals BGZ 0602',
      pass: REGRESSION_BIKE_FUZZY_REG_FORMAT.normsEqual === true,
      expected: true,
      actual: {
        normDash: REGRESSION_BIKE_FUZZY_REG_FORMAT.normDash,
        normSpace: REGRESSION_BIKE_FUZZY_REG_FORMAT.normSpace,
        normPlain: REGRESSION_BIKE_FUZZY_REG_FORMAT.normPlain,
      },
    },
    {
      name: 'Fuzzy reg: sold BGZ-0602 not active-block for BGZ 0602',
      pass: REGRESSION_BIKE_FUZZY_REG_FORMAT.blockedWhileActive === false,
      expected: false,
      actual: REGRESSION_BIKE_FUZZY_REG_FORMAT.blockedWhileActive,
    },
    {
      name: 'Fuzzy reg: sold history detected for BGZ 0602',
      pass: REGRESSION_BIKE_FUZZY_REG_FORMAT.hasHistory === true,
      expected: true,
      actual: REGRESSION_BIKE_FUZZY_REG_FORMAT.hasHistory,
    },
    {
      name: 'Fuzzy reg: Add Bike createBike with BGZ 0602 succeeds',
      pass: REGRESSION_BIKE_FUZZY_REG_FORMAT.addBikeError === null,
      expected: null,
      actual: REGRESSION_BIKE_FUZZY_REG_FORMAT.addBikeError,
    },
    {
      name: 'Fuzzy reg: Bike Purchase completeBikePurchase with BGZ 0602 succeeds',
      pass: REGRESSION_BIKE_FUZZY_REG_FORMAT.purchaseError === null,
      expected: null,
      actual: REGRESSION_BIKE_FUZZY_REG_FORMAT.purchaseError,
    },
    {
      name: 'Fuzzy reg: original sold BGZ-0602 record preserved',
      pass: REGRESSION_BIKE_FUZZY_REG_FORMAT.soldBikePreserved === true,
      expected: true,
      actual: REGRESSION_BIKE_FUZZY_REG_FORMAT.soldBikePreserved,
    },
    {
      name: 'Sale flow: installment loan marks bike SOLD',
      pass: REGRESSION_SALE_FLOW_STATUS.loanSaleStatus === 'SOLD',
      expected: 'SOLD',
      actual: REGRESSION_SALE_FLOW_STATUS.loanSaleStatus,
    },
    {
      name: 'Sale flow: loan links sold_loan_id on bike',
      pass: REGRESSION_SALE_FLOW_STATUS.loanIdMatches === true,
      expected: true,
      actual: {
        sold_loan_id: REGRESSION_SALE_FLOW_STATUS.loanSoldLoanId,
        loanIdMatches: REGRESSION_SALE_FLOW_STATUS.loanIdMatches,
      },
    },
    {
      name: 'Sale flow: re-add same reg after loan sale succeeds',
      pass: REGRESSION_SALE_FLOW_STATUS.readdAfterLoanError === null,
      expected: null,
      actual: REGRESSION_SALE_FLOW_STATUS.readdAfterLoanError,
    },
    {
      name: 'Sale flow: cash sale marks bike SOLD',
      pass: REGRESSION_SALE_FLOW_STATUS.cashSaleStatus === 'SOLD',
      expected: 'SOLD',
      actual: REGRESSION_SALE_FLOW_STATUS.cashSaleStatus,
    },
    {
      name: 'Sale flow: early settlement keeps bike SOLD',
      pass:
        REGRESSION_SALE_FLOW_STATUS.bikeBeforeSettlement === 'SOLD' &&
        REGRESSION_SALE_FLOW_STATUS.bikeAfterSettlement === 'SOLD',
      expected: { before: 'SOLD', after: 'SOLD' },
      actual: {
        before: REGRESSION_SALE_FLOW_STATUS.bikeBeforeSettlement,
        after: REGRESSION_SALE_FLOW_STATUS.bikeAfterSettlement,
      },
    },
    {
      name: 'Early settlement: payment row created',
      pass: REGRESSION_EARLY_SETTLEMENT_PAYMENT.paymentRecorded === true,
      expected: true,
      actual: REGRESSION_EARLY_SETTLEMENT_PAYMENT.paymentRecorded,
    },
    {
      name: 'Early settlement: ledger allocations created',
      pass: REGRESSION_EARLY_SETTLEMENT_PAYMENT.allocationCount >= 1,
      expected: '>= 1',
      actual: REGRESSION_EARLY_SETTLEMENT_PAYMENT.allocationCount,
    },
    {
      name: 'Early settlement: receipt stored',
      pass: REGRESSION_EARLY_SETTLEMENT_PAYMENT.receiptRecorded === true,
      expected: true,
      actual: REGRESSION_EARLY_SETTLEMENT_PAYMENT.receiptRecorded,
    },
    {
      name: 'Early settlement: printable document created',
      pass: REGRESSION_EARLY_SETTLEMENT_PAYMENT.documentRecorded === true,
      expected: true,
      actual: REGRESSION_EARLY_SETTLEMENT_PAYMENT.documentRecorded,
    },
    {
      name: 'Early settlement: settlement links to payment',
      pass:
        REGRESSION_EARLY_SETTLEMENT_PAYMENT.settlementLinkedToPayment === true,
      expected: true,
      actual: REGRESSION_EARLY_SETTLEMENT_PAYMENT.settlementLinkedToPayment,
    },
    {
      name: 'Early settlement: loan marked settled',
      pass: REGRESSION_EARLY_SETTLEMENT_PAYMENT.loanSettled === true,
      expected: true,
      actual: REGRESSION_EARLY_SETTLEMENT_PAYMENT.loanSettled,
    },
    {
      name: 'Early settlement: payment note round-trip',
      pass:
        parseEarlySettlementPaymentNote(
          REGRESSION_EARLY_SETTLEMENT_PAYMENT.paymentNote
        ) === REGRESSION_EARLY_SETTLEMENT_PAYMENT.settlementCode,
      expected: REGRESSION_EARLY_SETTLEMENT_PAYMENT.settlementCode,
      actual: parseEarlySettlementPaymentNote(
        REGRESSION_EARLY_SETTLEMENT_PAYMENT.paymentNote
      ),
    },
    {
      name: 'Early settlement: note helper format',
      pass:
        earlySettlementPaymentNote('EST-0001') === 'EARLY_SETTLEMENT:EST-0001',
      expected: 'EARLY_SETTLEMENT:EST-0001',
      actual: earlySettlementPaymentNote('EST-0001'),
    },
    {
      name: 'Scenario A: sell BGZ-0602 then re-add succeeds',
      pass: REGRESSION_SCENARIO_A.readdError === null,
      expected: null,
      actual: REGRESSION_SCENARIO_A.readdError,
    },
    {
      name: 'Scenario A: original bike stays sold',
      pass: REGRESSION_SCENARIO_A.firstStillSold === true,
      expected: true,
      actual: REGRESSION_SCENARIO_A.firstStillSold,
    },
    {
      name: 'Scenario A: loan still points to original bike',
      pass: REGRESSION_SCENARIO_A.loanStillOriginal === true,
      expected: true,
      actual: REGRESSION_SCENARIO_A.loanStillOriginal,
    },
    {
      name: 'Scenario B: BGZ 0602 sold then BGZ-0602 re-add succeeds',
      pass: REGRESSION_SCENARIO_B.readdError === null,
      expected: null,
      actual: REGRESSION_SCENARIO_B.readdError,
    },
    {
      name: 'Scenario B2: re-add same chassis after sell succeeds',
      pass: REGRESSION_SCENARIO_B_CHASSIS.readdError === null,
      expected: null,
      actual: REGRESSION_SCENARIO_B_CHASSIS.readdError,
    },
    {
      name: 'Scenario B2: loan still points to original bike',
      pass: REGRESSION_SCENARIO_B_CHASSIS.loanStillOriginal === true,
      expected: true,
      actual: REGRESSION_SCENARIO_B_CHASSIS.loanStillOriginal,
    },
    {
      name: 'Scenario C: duplicate active BGZ-0602 allowed',
      pass: REGRESSION_SCENARIO_C.readdError === null,
      expected: null,
      actual: REGRESSION_SCENARIO_C.readdError,
    },
    {
      name: 'Legacy sold row: not treated as active inventory',
      pass: REGRESSION_LEGACY_SOLD_STATUS_MISMATCH.treatedInactive === true,
      expected: true,
      actual: REGRESSION_LEGACY_SOLD_STATUS_MISMATCH.treatedInactive,
    },
    {
      name: 'Legacy sold row: re-add same registration succeeds',
      pass: REGRESSION_LEGACY_SOLD_STATUS_MISMATCH.readdError === null,
      expected: null,
      actual: REGRESSION_LEGACY_SOLD_STATUS_MISMATCH.readdError,
    },
    {
      name: 'Legacy sold row: original bike id preserved',
      pass: REGRESSION_LEGACY_SOLD_STATUS_MISMATCH.originalIdPreserved === true,
      expected: true,
      actual: REGRESSION_LEGACY_SOLD_STATUS_MISMATCH.originalIdPreserved,
    },
    {
      name: 'Scenario D: loan still references original after re-add',
      pass: REGRESSION_LEGACY_SOLD_STATUS_MISMATCH.loanStillOriginal === true,
      expected: true,
      actual: REGRESSION_LEGACY_SOLD_STATUS_MISMATCH.loanStillOriginal,
    },
  ];
}

export function allRegressionExamplesPass(): boolean {
  return verifyRegressionExamples().every((c) => c.pass);
}
