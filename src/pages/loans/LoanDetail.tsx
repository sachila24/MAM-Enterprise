import React, { useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  AlertCircleIcon,
  BanknoteIcon,
  FileTextIcon,
  ShieldIcon,
} from 'lucide-react';
import { KpiCard } from '../../components/ui/KpiCard';
import { StatusChip } from '../../components/ui/StatusChip';
import { EmptyState } from '../../components/ui/EmptyState';
import { isInterestOnlyLoan, type Loan } from '../../types/loan';
import type { Guarantee } from '../../types/entities';
import { canRequestEarlySettlement } from '../../lib/finance/earlySettlement';
import {
  getFixedLoanDisplayStatus,
  getFixedLoanArrearsSummary,
  oldestArrearsDueDate,
  daysBetweenDates,
  runLateFeeEngine,
  type InstallmentArrearsInput,
} from '../../lib/finance/fixedInstallmentStatus';
import {
  buildFixedInstallmentLedgerEntries,
  buildInterestOnlyLedgerEntries,
  enrichLedgerInstallmentsWithLiveLateFees,
  formatOverdueHuman,
} from '../../lib/display/ledgerDisplay';
import { formatLKR, formatDate, formatEnum } from '../../lib/format';
import { useT } from '../../i18n/I18nProvider';
import {
  getNextDueDateForFixedInstallments,
  getNextDueDateForInterestOnly,
} from '../../lib/finance/loanNextDue';
import {
  resolveLoanDetailPreview,
  LOAN_DETAIL_PREVIEW_LINKS,
  type LoanDetailData,
} from './loanDetailPreviewData';
import { useDemoDb } from '../../lib/local-db/useDemoDb';
import {
  getLoanDetailFromDb,
  listLoanDetailLinks,
} from '../../lib/local-db/loanDetail';
import { getDb } from '../../lib/local-db/localDb';
import { syncFixedInstallmentLateFees } from '../../lib/local-db/fixedInstallmentSync';
import { persistInterestOnlyCycles } from '../../lib/local-db/interestOnlySync';
import { summarizeInterestOnlyLoan } from '../../lib/finance/interestOnlyCycles';
import { roundLKR } from '../../lib/finance/money';

import { useSystemToday } from '../../lib/time/systemTime';
import { LedgerTable } from '../../components/loans/LedgerTable';

export function LoanDetail() {
  const { t } = useT();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const db = useDemoDb();
  const asOfToday = useSystemToday();

  useEffect(() => {
    if (!id) return;
    const loan = db.loans.find((l) => l.id === id);
    if (loan?.repayment_method === 'INTEREST_ONLY_REDUCING_PRINCIPAL') {
      persistInterestOnlyCycles(getDb(), id, asOfToday);
    }
    if (loan?.repayment_method === 'FIXED_TERM_INSTALLMENT') {
      syncFixedInstallmentLateFees(getDb(), id, asOfToday);
    }
  }, [id, db, asOfToday]);

  const detail =
    (id ? getLoanDetailFromDb(id, db) : null) ?? resolveLoanDetailPreview(id);
  const demoLinks = listLoanDetailLinks(db);

  if (!detail) {
    return (
      <div className="max-w-3xl mx-auto pt-8">
        <EmptyState
          icon={AlertCircleIcon}
          title="Loan not found"
          description="Choose a demo loan below."
          action={
            <ul className="mt-4 space-y-2 text-sm">
              {demoLinks.map((link) => (
                <li key={link.id}>
                  <Link
                    to={`/loans/${link.id}`}
                    className="font-semibold text-brand-600 hover:text-brand-500"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              {LOAN_DETAIL_PREVIEW_LINKS.map((link) => (
                <li key={link.id}>
                  <Link
                    to={`/loans/${link.id}`}
                    className="font-semibold text-brand-600 hover:text-brand-500"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          }
        />
      </div>
    );
  }

  if (isInterestOnlyLoan(detail.loan)) {
    return <InterestOnlyLoanDetail detail={detail} navigate={navigate} />;
  }

  return <FixedInstallmentLoanDetail detail={detail} navigate={navigate} />;
}

function InterestOnlyLoanDetail({
  detail,
  navigate,
}: {
  detail: LoanDetailData;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const { t } = useT();
  const { loan, customer, interestCycles, guarantees, ledgerPayments } = detail;

  const asOf = useSystemToday();
  const cycleAlloc = useMemo(
    () =>
      interestCycles.map((c) => ({
        id: c.id,
        cycleNumber: c.cycleNumber,
        dueDate: c.dueDate,
        openingPrincipal: c.openingPrincipal,
        interestDue: c.interestDue,
        interestPaid: c.interestPaid,
        principalPaid: c.principalPaid,
      })),
    [interestCycles]
  );

  const summary = useMemo(
    () =>
      summarizeInterestOnlyLoan(
        loan.startDate,
        loan.interestRate,
        loan.currentPrincipalBalance,
        cycleAlloc,
        asOf
      ),
    [loan.startDate, loan.interestRate, loan.currentPrincipalBalance, cycleAlloc, asOf]
  );

  const nextDueIo = useMemo(
    () =>
      getNextDueDateForInterestOnly(loan.startDate, cycleAlloc, asOf),
    [loan.startDate, cycleAlloc, asOf]
  );

  const pendingInterest =
    loan.pendingInterestAmount ?? summary.pendingInterest;

  const nextDueLabel =
    loan.status === 'COMPLETED'
      ? 'Completed'
      : nextDueIo.dueDate
        ? formatDate(nextDueIo.dueDate)
        : nextDueIo.label;

  const ledgerEntries = useMemo(
    () =>
      buildInterestOnlyLedgerEntries(
        loan.startDate,
        loan.originalPrincipalAmount,
        interestCycles,
        ledgerPayments,
        asOf
      ),
    [
      loan.startDate,
      loan.originalPrincipalAmount,
      interestCycles,
      ledgerPayments,
      asOf,
    ]
  );

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <LoanHeader
        loan={loan}
        customerName={customer.name}
        subtitle={formatEnum(loan.repaymentMethod)}
        actions={
          <LoanActionBar
            loanId={loan.id}
            navigate={navigate}
            showEarlySettlement={false}
            monthsCompleted={detail.monthsCompleted}
            minimumMonths={loan.minimumMonthsBeforeSettlement}
          />
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
        <KpiCard
          label="Original principal"
          value={formatLKR(loan.originalPrincipalAmount)}
        />
        <KpiCard
          label="Current principal balance"
          value={formatLKR(loan.currentPrincipalBalance)}
        />
        <KpiCard label="Pending interest due" value={formatLKR(pendingInterest)} />
        <KpiCard
          label="Interest cycles due"
          value={String(summary.cyclesDueCount)}
        />
        <KpiCard
          label="Next estimated interest"
          value={formatLKR(summary.nextEstimatedInterest)}
        />
        <KpiCard label="Monthly rate" value={`${loan.interestRate}%`} />
        <KpiCard label="Next due date" value={nextDueLabel} />
      </div>

      <section className="mb-8">
        <SectionTitle icon={BanknoteIcon} title={t('loanLedger')} />
        <LedgerTable entries={ledgerEntries} />
      </section>

      <GuaranteesSection
        guarantees={guarantees}
        loanId={loan.id}
        navigate={navigate}
      />
    </div>
  );
}

function FixedInstallmentLoanDetail({
  detail,
  navigate,
}: {
  detail: LoanDetailData;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const { t } = useT();
  const {
    loan,
    customer,
    installments,
    guarantees,
    bike,
    ledgerPayments,
    ledgerInstallments,
  } = detail;
  const asOfDate = useSystemToday();

  const installmentsWithIds = useMemo(
    () =>
      installments.map((inst, index) => ({
        ...inst,
        id: inst.id ?? `ledger-${inst.installmentNumber}-${index}`,
      })),
    [installments]
  );

  const lateFeeEngine = useMemo(
    () =>
      runLateFeeEngine(
        installmentsWithIds,
        loan.installmentAmount ?? 0,
        loan.lateFeeRate,
        { asOfDate }
      ),
    [
      installmentsWithIds,
      loan.installmentAmount,
      loan.lateFeeRate,
      asOfDate,
    ]
  );

  const arrearsSummary = useMemo(
    () =>
      getFixedLoanArrearsSummary(
        installments as InstallmentArrearsInput[],
        asOfDate,
        loan.lateFeeRate,
        loan.installmentAmount
      ),
    [installments, asOfDate, loan.lateFeeRate, loan.installmentAmount]
  );

  const displayLoanStatus = useMemo(
    () =>
      getFixedLoanDisplayStatus(
        loan.status,
        installments,
        asOfDate,
        loan.lateFeeRate,
        loan.installmentAmount
      ),
    [loan.status, installments, loan.lateFeeRate, loan.installmentAmount, asOfDate]
  );

  const nextFixed = useMemo(
    () =>
      getNextDueDateForFixedInstallments(
        installments as InstallmentArrearsInput[],
        loan.lateFeeRate,
        asOfDate,
        loan.installmentAmount
      ),
    [installments, loan.lateFeeRate, loan.installmentAmount, asOfDate]
  );

  const nextDueLabel =
    loan.status === 'COMPLETED'
      ? 'Completed'
      : nextFixed.dueDate
        ? formatDate(nextFixed.dueDate)
        : nextFixed.label;

  const ledgerInstallmentsLive = useMemo(() => {
    const liveByNumber = new Map(
      lateFeeEngine.lines.map((line) => [line.installmentNumber, line.lateFee])
    );
    const settledByNumber = new Map(
      lateFeeEngine.lines.map((line) => [
        line.installmentNumber,
        line.lateFeeSettled,
      ])
    );
    const startDateByNumber = new Map(
      lateFeeEngine.lines.map((line) => [
        line.installmentNumber,
        line.lateFeeStartDate,
      ])
    );
    return enrichLedgerInstallmentsWithLiveLateFees(
      ledgerInstallments,
      liveByNumber,
      settledByNumber,
      startDateByNumber
    );
  }, [ledgerInstallments, lateFeeEngine]);

  const ledgerEntries = useMemo(
    () =>
      buildFixedInstallmentLedgerEntries(
        loan.startDate,
        loan.totalPayable ?? loan.principalAmount,
        ledgerInstallmentsLive,
        ledgerPayments,
        asOfDate
      ),
    [
      loan.startDate,
      loan.totalPayable,
      loan.principalAmount,
      ledgerInstallmentsLive,
      ledgerPayments,
      asOfDate,
    ]
  );

  const overdueLabel = useMemo(() => {
    if (loan.status === 'COMPLETED') return null;
    const oldest = oldestArrearsDueDate(
      installments as InstallmentArrearsInput[],
      asOfDate
    );
    if (!oldest) return null;
    const days = daysBetweenDates(oldest, asOfDate);
    if (days <= 0) return null;
    return formatOverdueHuman(days);
  }, [loan.status, installments, asOfDate]);

  const financeLabel =
    loan.loanPurpose === 'BIKE_INSTALLMENT' ? 'Finance amount' : 'Loan amount';

  const downPaymentHint =
    bike && loan.principalAmount <= bike.sellingPrice
      ? roundLKR(bike.sellingPrice - loan.principalAmount)
      : undefined;

  const settlementEligible = canRequestEarlySettlement(
    detail.monthsCompleted,
    loan.minimumMonthsBeforeSettlement
  );

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <LoanHeader
        loan={loan}
        displayStatus={displayLoanStatus}
        customerName={customer.name}
        subtitle={`${formatEnum(loan.loanPurpose)} · ${formatEnum(loan.repaymentMethod)}`}
        actions={
          <LoanActionBar
            loanId={loan.id}
            navigate={navigate}
            showEarlySettlement
            settlementEligible={settlementEligible}
            monthsCompleted={detail.monthsCompleted}
            minimumMonths={loan.minimumMonthsBeforeSettlement}
          />
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-6">
        <KpiCard
          label={financeLabel}
          value={formatLKR(loan.principalAmount)}
        />
        <KpiCard label="Total interest" value={formatLKR(loan.totalInterestAmount ?? 0)} />
        <KpiCard label="Total payable" value={formatLKR(loan.totalPayable ?? 0)} />
        <KpiCard label="Paid" value={formatLKR(loan.paidAmount)} />
        <KpiCard label="Balance" value={formatLKR(loan.balanceAmount)} />
        <KpiCard
          label="Monthly installment"
          value={formatLKR(loan.installmentAmount ?? 0)}
        />
      </div>

      {bike && (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3 rounded-xl bg-white p-5 ring-1 ring-neutral-200 shadow-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Linked bike
            </p>
            <p className="mt-1 font-semibold text-neutral-900">{bike.model}</p>
            <p className="text-sm text-neutral-600">
              Stock ref {bike.bikeCode} · Engine {bike.engineNo}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Bike selling price
            </p>
            <p className="mt-1 tabular-nums font-semibold text-neutral-900">
              {formatLKR(bike.sellingPrice)}
            </p>
          </div>
          {downPaymentHint !== undefined ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Estimated down payment
              </p>
              <p className="mt-1 tabular-nums font-semibold text-neutral-900">
                {formatLKR(downPaymentHint)}
              </p>
              <p className="mt-2 text-xs text-neutral-500">
                Selling price minus finance amount
              </p>
            </div>
          ) : null}
          <div className="sm:col-span-3">
            <Link
              to={`/bikes/${bike.id}`}
              className="text-sm font-semibold text-brand-600 hover:text-brand-500"
            >
              Open bike detail
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <KpiCard label="Term" value={`${loan.termMonths ?? '—'} months`} />
        <KpiCard label="Next due" value={nextDueLabel} />
        <KpiCard
          label="Balance"
          value={
            loan.status === 'COMPLETED' || loan.balanceAmount <= 0
              ? formatLKR(0)
              : formatLKR(loan.balanceAmount)
          }
        />
      </div>

      {loan.status !== 'COMPLETED' && arrearsSummary.hasArrears && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Overdue amount (live)"
            value={formatLKR(arrearsSummary.totalArrearsDue)}
          />
          <KpiCard
            label="Late fee accrued"
            value={formatLKR(lateFeeEngine.totalLateFee)}
          />
          <KpiCard
            label="Late fee paid"
            value={formatLKR(
              installments.reduce((sum, i) => sum + i.lateFeePaid, 0)
            )}
          />
          <KpiCard
            label="Late fee remaining"
            value={formatLKR(lateFeeEngine.totalLateFeeOutstanding)}
          />
        </div>
      )}

      {overdueLabel && (
        <div className="mb-6 rounded-lg bg-danger-50 border border-danger-200 px-4 py-3 text-sm font-medium text-danger-800">
          {overdueLabel}
        </div>
      )}

      <section className="mb-8">
        <SectionTitle icon={BanknoteIcon} title={t('loanLedger')} />
        <LedgerTable entries={ledgerEntries} />
      </section>

      <GuaranteesSection
        guarantees={guarantees}
        loanId={loan.id}
        navigate={navigate}
      />
    </div>
  );
}

function LoanHeader({
  loan,
  displayStatus,
  customerName,
  subtitle,
  actions,
}: {
  loan: Loan;
  displayStatus?: string;
  customerName: string;
  subtitle: string;
  actions: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-neutral-900 tabular-nums">
            {loan.loanCode}
          </h1>
          <StatusChip status={displayStatus ?? loan.status} />
        </div>
        <p className="mt-2 text-sm text-neutral-500">
          <Link
            to={`/customers/${loan.customerId}`}
            className="font-medium text-brand-600 hover:text-brand-500"
          >
            {customerName}
          </Link>
          {' · '}
          {subtitle}
        </p>
      </div>
      {actions}
    </div>
  );
}

function LoanActionBar({
  loanId,
  navigate,
  showEarlySettlement,
  settlementEligible = false,
  monthsCompleted,
  minimumMonths,
}: {
  loanId: string;
  navigate: ReturnType<typeof useNavigate>;
  showEarlySettlement: boolean;
  settlementEligible?: boolean;
  monthsCompleted: number;
  minimumMonths: number;
}) {
  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        <ActionButton
          primary
          onClick={() => navigate(`/payments/new?loanId=${loanId}`)}
        >
          Record Payment
        </ActionButton>
        <ActionButton onClick={() => navigate(`/guarantees/new?loanId=${loanId}`)}>
          Add Guarantee
        </ActionButton>
        {showEarlySettlement && (
          <ActionButton
            disabled={!settlementEligible}
            onClick={() => navigate(`/loans/${loanId}/early-settlement`)}
          >
            Early Settlement
          </ActionButton>
        )}
        <ActionButton
          variant="danger"
          onClick={() => window.alert(t('cancelLoanSupabaseSoon'))}
        >
          Cancel Loan
        </ActionButton>
      </div>
      {showEarlySettlement && !settlementEligible && (
        <p className="text-xs text-neutral-500 max-w-xs sm:text-right">
          Early settlement is allowed after {minimumMonths} completed months.
          {monthsCompleted > 0 && ` (${monthsCompleted} completed so far.)`}
        </p>
      )}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  primary,
  variant = 'default',
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}) {
  const base =
    'inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed';
  const styles = primary
    ? `${base} bg-brand-600 text-white hover:bg-brand-500`
    : variant === 'danger'
      ? `${base} bg-white text-danger-700 ring-1 ring-danger-300 hover:bg-danger-50`
      : `${base} bg-white text-neutral-900 ring-1 ring-neutral-300 hover:bg-neutral-50`;
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={styles}>
      {children}
    </button>
  );
}

function SectionTitle({
  title,
  icon: Icon,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-900 mb-4">
      <Icon className="h-5 w-5 text-brand-600" />
      {title}
    </h2>
  );
}

function GuaranteesSection({
  guarantees,
  loanId,
  navigate,
}: {
  guarantees: Guarantee[];
  loanId: string;
  navigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <section>
      <SectionTitle icon={ShieldIcon} title="Guarantees" />
      {guarantees.length === 0 ? (
        <EmptyState
          icon={FileTextIcon}
          title="No guarantees"
          description="Add a guarantee item linked to this loan."
          action={
            <button
              type="button"
              onClick={() => navigate(`/guarantees/new?loanId=${loanId}`)}
              className="mt-4 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Add Guarantee
            </button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {guarantees.map((g) => (
            <li
              key={g.id}
              className="rounded-xl bg-white p-4 ring-1 ring-neutral-200 shadow-sm"
            >
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="text-xs text-neutral-500">{g.guaranteeCode}</p>
                  <p className="font-medium text-neutral-900">
                    {formatEnum(g.type)}
                  </p>
                </div>
                <StatusChip status={g.status} />
              </div>
              <p className="mt-2 text-sm text-neutral-600">{g.description}</p>
              <p className="mt-1 text-xs text-neutral-500">
                {g.storageLocation} · Received {formatDate(g.receivedAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

