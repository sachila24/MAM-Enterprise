import type { ReportCsvType } from '../i18n/messages';
import { getDb } from '../local-db/localDb';
import { listBikes } from '../local-db/repositories/bikesRepo';
import { getOverdueLoans } from '../local-db/repositories/dashboardRepo';
import { listExpenses } from '../local-db/repositories/expensesRepo';
import { listGuarantees } from '../local-db/repositories/guaranteesRepo';
import { listLoans } from '../local-db/repositories/loansRepo';
import { listLoanPayments } from '../local-db/repositories/paymentsRepo';
import { listCashTransactions } from '../local-db/repositories/cashTransactionsRepo';
import type { CashTransactionType } from '../local-db/types';
import { formatEnum } from '../format';
import type { DisplayMode } from '../i18n/simpleLabels';
import { normalizeDate } from '../time/systemTime';
import type { MamDemoDb } from '../local-db/types';

export interface ReportCsvOptions {
  /** YYYY-MM-DD — daily collections */
  date?: string;
  /** YYYY-MM — monthly collections / expenses */
  month?: string;
  language?: DisplayMode;
}

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function csvRow(cells: (string | number | null | undefined)[]): string {
  return cells.map(csvCell).join(',');
}

/** Excel/WPS need BOM to detect UTF-8 when opening CSV by double-click. */
export const UTF8_BOM = '\uFEFF';

export function createUtf8CsvBlob(content: string): Blob {
  return new Blob([UTF8_BOM, content], { type: 'text/csv;charset=utf-8;' });
}

/** Report CSV placeholder for missing optional text fields (not stored in DB). */
function csvText(value: string | null | undefined): string {
  return value?.trim() ? value.trim() : '';
}

function customerName(db: MamDemoDb, customerId: string): string {
  return db.customers.find((c) => c.id === customerId)?.full_name ?? '';
}

function loanCode(db: MamDemoDb, loanId: string): string {
  return db.loans.find((l) => l.id === loanId)?.loan_code ?? '';
}

function label(
  value: string | null | undefined,
  language: DisplayMode = 'both'
): string {
  return formatEnum(value ?? '', language);
}

function paymentMatchesDay(paymentDate: string, day: string): boolean {
  return normalizeDate(paymentDate) === normalizeDate(day);
}

function paymentMatchesMonth(paymentDate: string, month: string): boolean {
  return normalizeDate(paymentDate).startsWith(month);
}

function expenseMatchesMonth(expenseDate: string, month: string): boolean {
  return normalizeDate(expenseDate).startsWith(month);
}

function cashTxnMatchesDay(txnDate: string, day: string): boolean {
  return normalizeDate(txnDate) === normalizeDate(day);
}

function cashTxnMatchesMonth(txnDate: string, month: string): boolean {
  return normalizeDate(txnDate).startsWith(month);
}

function incomeTypeLabel(
  type: CashTransactionType | 'LOAN_REPAYMENT',
  language: DisplayMode
): string {
  const key =
    type === 'LOAN_ADVANCE_PAYMENT'
      ? 'LOAN_ADVANCE_PAYMENT'
      : type === 'SERVICE_FEE_INCOME'
        ? 'SERVICE_FEE_INCOME'
        : type === 'REGISTRATION_FEE_INCOME'
          ? 'REGISTRATION_FEE_INCOME'
          : 'LOAN_REPAYMENT';
  return label(key, language);
}

function generateDailyIncome(
  db: MamDemoDb,
  date: string,
  language: DisplayMode
): string[] {
  const day = normalizeDate(date);
  const paymentRows = listLoanPayments(db)
    .filter(
      (p) => p.status === 'CONFIRMED' && paymentMatchesDay(p.paymentDate, day)
    )
    .map((p) =>
      csvRow([
        normalizeDate(p.paymentDate),
        incomeTypeLabel('LOAN_REPAYMENT', language),
        customerName(db, p.customerId),
        loanCode(db, p.loanId),
        p.receiptNumber,
        p.amount,
      ])
    );

  const feeRows = listCashTransactions(db)
    .filter((t) => cashTxnMatchesDay(t.transactionDate, day))
    .map((t) =>
      csvRow([
        normalizeDate(t.transactionDate),
        incomeTypeLabel(t.transactionType, language),
        customerName(db, t.customerId),
        loanCode(db, t.loanId),
        t.transactionCode,
        t.amount,
      ])
    );

  return [...paymentRows, ...feeRows].sort((a, b) => a.localeCompare(b));
}

function generateMonthlyIncome(
  db: MamDemoDb,
  month: string,
  language: DisplayMode
): string[] {
  const paymentRows = listLoanPayments(db)
    .filter(
      (p) =>
        p.status === 'CONFIRMED' && paymentMatchesMonth(p.paymentDate, month)
    )
    .map((p) =>
      csvRow([
        normalizeDate(p.paymentDate),
        incomeTypeLabel('LOAN_REPAYMENT', language),
        customerName(db, p.customerId),
        loanCode(db, p.loanId),
        p.receiptNumber,
        p.amount,
      ])
    );

  const feeRows = listCashTransactions(db)
    .filter((t) => cashTxnMatchesMonth(t.transactionDate, month))
    .map((t) =>
      csvRow([
        normalizeDate(t.transactionDate),
        incomeTypeLabel(t.transactionType, language),
        customerName(db, t.customerId),
        loanCode(db, t.loanId),
        t.transactionCode,
        t.amount,
      ])
    );

  return [...paymentRows, ...feeRows].sort((a, b) => a.localeCompare(b));
}

/** Service and registration fee income only — not loan repayments. */
function generateIncomeSummary(
  db: MamDemoDb,
  month: string,
  language: DisplayMode
): string[] {
  return listCashTransactions(db)
    .filter(
      (t) =>
        cashTxnMatchesMonth(t.transactionDate, month) &&
        (t.transactionType === 'SERVICE_FEE_INCOME' ||
          t.transactionType === 'REGISTRATION_FEE_INCOME')
    )
    .sort((a, b) => a.transactionDate.localeCompare(b.transactionDate))
    .map((t) =>
      csvRow([
        normalizeDate(t.transactionDate),
        incomeTypeLabel(t.transactionType, language),
        customerName(db, t.customerId),
        loanCode(db, t.loanId),
        t.transactionCode,
        t.amount,
      ])
    );
}

function generateDailyCollections(
  db: MamDemoDb,
  date: string,
  language: DisplayMode
): string[] {
  const day = normalizeDate(date);
  return listLoanPayments(db)
    .filter(
      (p) => p.status === 'CONFIRMED' && paymentMatchesDay(p.paymentDate, day)
    )
    .sort((a, b) => a.paymentDate.localeCompare(b.paymentDate))
    .map((p) =>
      csvRow([
        normalizeDate(p.paymentDate),
        p.receiptNumber,
        customerName(db, p.customerId),
        loanCode(db, p.loanId),
        p.amount,
        p.discountAmount ?? 0,
        label(p.paymentMethod, language),
        label(p.status, language),
      ])
    );
}

function generateMonthlyCollections(
  db: MamDemoDb,
  month: string,
  language: DisplayMode
): string[] {
  return listLoanPayments(db)
    .filter(
      (p) =>
        p.status === 'CONFIRMED' && paymentMatchesMonth(p.paymentDate, month)
    )
    .sort((a, b) => a.paymentDate.localeCompare(b.paymentDate))
    .map((p) =>
      csvRow([
        normalizeDate(p.paymentDate),
        p.receiptNumber,
        customerName(db, p.customerId),
        loanCode(db, p.loanId),
        p.amount,
        p.discountAmount ?? 0,
        label(p.paymentMethod, language),
        label(p.status, language),
      ])
    );
}

function generateLoanRows(
  db: MamDemoDb,
  filter: (status: string) => boolean,
  language: DisplayMode
): string[] {
  return listLoans(db)
    .filter((l) => filter(l.status))
    .sort((a, b) => a.loanCode.localeCompare(b.loanCode))
    .map((l) =>
      csvRow([
        l.loanCode,
        customerName(db, l.customerId),
        label(l.repaymentMethod, language),
        l.principalAmount,
        l.balanceAmount,
        label(l.status, language),
        normalizeDate(l.startDate),
      ])
    );
}

function generateOverdueLoans(
  db: MamDemoDb,
  language: DisplayMode
): string[] {
  return getOverdueLoans(db)
    .sort((a, b) => a.loanCode.localeCompare(b.loanCode))
    .map((l) =>
      csvRow([
        l.loanCode,
        l.customer?.name ?? customerName(db, l.customerId),
        label(l.repaymentMethod, language),
        l.principalAmount,
        l.balanceAmount,
        label(l.status, language),
        normalizeDate(l.startDate),
      ])
    );
}

function generateBikeStock(db: MamDemoDb, language: DisplayMode): string[] {
  return listBikes(db)
    .sort((a, b) => a.bikeCode.localeCompare(b.bikeCode))
    .map((b) =>
      csvRow([
        label('BIKE', language),
        `${b.bikeCode} — ${b.model}`,
        `${b.chassisNo} / ${b.engineNo}`,
        b.sellingPrice,
        label(b.status.toUpperCase(), language),
      ])
    );
}

function generateGuaranteesHeld(
  db: MamDemoDb,
  language: DisplayMode
): string[] {
  return listGuarantees(db)
    .filter((g) => g.status === 'held')
    .sort((a, b) => a.guaranteeCode.localeCompare(b.guaranteeCode))
    .map((g) => {
      const row = db.guarantees.find((x) => x.id === g.id);
      const customerId = row?.customer_id ?? '';
      const description = csvText(
        g.description ||
          g.fileNumber ||
          g.vehicleNumber ||
          g.itemReference
      );
      return csvRow([
        label(g.type, language),
        description,
        customerId ? customerName(db, customerId) : '',
        loanCode(db, g.loanId),
        csvText(g.storageLocation),
        normalizeDate(g.receivedAt),
        label(g.status.toUpperCase(), language),
      ]);
    });
}

function generateExpenses(
  db: MamDemoDb,
  month: string,
  language: DisplayMode
): string[] {
  return listExpenses(db)
    .filter((e) => expenseMatchesMonth(e.date, month))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) =>
      csvRow([
        normalizeDate(e.date),
        label(e.category, language),
        csvText(e.notes),
        e.amount,
      ])
    );
}

/** Build CSV data rows for a report from the current local DB snapshot. */
export function generateReportCsvRows(
  reportType: ReportCsvType,
  options: ReportCsvOptions = {}
): string[] {
  const db = getDb();
  const language = options.language ?? 'both';

  switch (reportType) {
    case 'dailyCollections':
      return generateDailyCollections(
        db,
        options.date ?? normalizeDate(new Date()),
        language
      );
    case 'monthlyCollections':
      return generateMonthlyCollections(
        db,
        options.month ?? normalizeDate(new Date()).slice(0, 7),
        language
      );
    case 'dailyIncome':
      return generateDailyIncome(
        db,
        options.date ?? normalizeDate(new Date()),
        language
      );
    case 'monthlyIncome':
      return generateMonthlyIncome(
        db,
        options.month ?? normalizeDate(new Date()).slice(0, 7),
        language
      );
    case 'incomeSummary':
      return generateIncomeSummary(
        db,
        options.month ?? normalizeDate(new Date()).slice(0, 7),
        language
      );
    case 'activeLoans':
      return generateLoanRows(
        db,
        (status) => status === 'ACTIVE' || status === 'OVERDUE',
        language
      );
    case 'overdueLoans':
      return generateOverdueLoans(db, language);
    case 'completedLoans':
      return generateLoanRows(
        db,
        (status) => status === 'COMPLETED' || status === 'SETTLED',
        language
      );
    case 'bikeStock':
      return generateBikeStock(db, language);
    case 'guaranteesHeld':
      return generateGuaranteesHeld(db, language);
    case 'expenses':
      return generateExpenses(
        db,
        options.month ?? normalizeDate(new Date()).slice(0, 7),
        language
      );
    default:
      return [];
  }
}
