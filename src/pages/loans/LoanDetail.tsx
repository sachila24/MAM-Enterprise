import React, { useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  BanknoteIcon,
  BikeIcon,
  FileTextIcon,
  ShieldIcon,
} from 'lucide-react';
import { KpiCard } from '../../components/ui/KpiCard';
import { StatusChip } from '../../components/ui/StatusChip';
import { EmptyState } from '../../components/ui/EmptyState';
import { isInterestOnlyLoan, type Loan } from '../../types/loan';
import type { Bike, Guarantee } from '../../types/entities';
import {
  guaranteeDetailLines,
} from '../../lib/guarantee/guaranteeFields';
import type { LabelKey } from '../../lib/i18n/simpleLabels';
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
} from '../../lib/display/ledgerDisplay';
import { formatLKR, formatDate, formatEnum } from '../../lib/format';
import { formatBikeSelectLabel } from '../../lib/display/bikeDisplay';
import { useT } from '../../i18n/I18nProvider';
import { getNextDueDateForFixedInstallments } from '../../lib/finance/loanNextDue';
import type { LoanDetailData } from './loanDetailTypes';
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
import { findLoanCreationDocument } from '../../lib/documents/documentService';
import { LinkedBikeSummary } from '../../components/guarantees/LinkedBikeSummary';
import { getDocumentLabel } from '../../lib/i18n/documentLabels';
import { listCashTransactionsForLoan } from '../../lib/local-db/repositories/cashTransactionsRepo';

function formatOverdueLabel(
  daysOverdue: number,
  tf: (key: LabelKey, params?: Record<string, string | number>) => string
): string {
  if (daysOverdue <= 0) return '';
  const months = Math.floor(daysOverdue / 30);
  const days = daysOverdue % 30;
  if (months === 0) return tf('overdueDaysOnly', { days });
  if (days === 0) return tf('overdueMonthsOnly', { months });
  return tf('overdueMonthsAndDays', { months, days });
}

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

  const detail = id ? getLoanDetailFromDb(id, db) : null;
  const demoLinks = listLoanDetailLinks(db);
  const loanInvoiceDoc = id ? findLoanCreationDocument(db, id) : undefined;

  if (!detail) {
    return (
      <div className="max-w-3xl mx-auto pt-8">
        <EmptyState
          icon={AlertCircleIcon}
          title={t('loanNotFound')}
          description={t('chooseLoanBelow')}
          action={
            demoLinks.length > 0 ? (
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
              </ul>
            ) : (
              <Link
                to="/loans"
                className="inline-flex items-center gap-2 font-semibold text-brand-600 hover:text-brand-500"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                {t('backToLoans')}
              </Link>
            )
          }
        />
      </div>
    );
  }

  if (isInterestOnlyLoan(detail.loan)) {
    return (
      <InterestOnlyLoanDetail
        detail={detail}
        navigate={navigate}
        invoiceDocumentId={loanInvoiceDoc?.id}
        loanInvoiceDocumentNumber={loanInvoiceDoc?.document_number}
      />
    );
  }

  return (
    <FixedInstallmentLoanDetail
      detail={detail}
      navigate={navigate}
      invoiceDocumentId={loanInvoiceDoc?.id}
      loanInvoiceDocumentNumber={loanInvoiceDoc?.document_number}
    />
  );
}

function InterestOnlyLoanDetail({
  detail,
  navigate,
  invoiceDocumentId,
  loanInvoiceDocumentNumber,
}: {
  detail: LoanDetailData;
  navigate: ReturnType<typeof useNavigate>;
  invoiceDocumentId?: string;
  loanInvoiceDocumentNumber?: string;
}) {
  const { t, language } = useT();
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

  const pendingInterest =
    loan.pendingInterestAmount ?? summary.pendingInterest;

  const ledgerEntries = useMemo(
    () =>
      buildInterestOnlyLedgerEntries(
        loan.startDate,
        loan.originalPrincipalAmount,
        interestCycles,
        ledgerPayments,
        asOf,
        {
          loanOpeningRef:
            loanInvoiceDocumentNumber ?? loan.loanCode ?? null,
        }
      ),
    [
      loan.startDate,
      loan.originalPrincipalAmount,
      loan.loanCode,
      loanInvoiceDocumentNumber,
      interestCycles,
      ledgerPayments,
      asOf,
    ]
  );

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-5">
        <LoanDetailBackButton navigate={navigate} />
        <LoanHeader
          loan={loan}
          customerName={customer.name}
          subtitle={formatEnum(loan.repaymentMethod, language)}
          actions={
            <LoanActionBar
              loanId={loan.id}
              navigate={navigate}
              showEarlySettlement={false}
              monthsCompleted={detail.monthsCompleted}
              minimumMonths={loan.minimumMonthsBeforeSettlement}
              invoiceDocumentId={invoiceDocumentId}
            />
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
        <KpiCard
          label={t('kpiOriginalPrincipal')}
          value={formatLKR(loan.originalPrincipalAmount)}
        />
        <KpiCard
          label={
            language === 'si'
              ? t('kpiCurrentPrincipalShort')
              : t('kpiCurrentPrincipalBalance')
          }
          value={formatLKR(loan.currentPrincipalBalance)}
        />
        <KpiCard
          label={
            language === 'si'
              ? t('kpiPendingInterestShort')
              : t('kpiPendingInterestDue')
          }
          value={formatLKR(pendingInterest)}
        />
        <KpiCard
          label={
            language === 'si'
              ? t('kpiNextInterestShort')
              : t('kpiNextEstimatedInterest')
          }
          value={formatLKR(summary.nextEstimatedInterest)}
        />
        <KpiCard
          label={t('kpiMonthlyRate')}
          value={`${loan.interestRate}%`}
        />
      </div>

      <LoanOriginationSection loan={loan} />

      <section className="mb-8">
        <SectionTitle icon={BanknoteIcon} title={t('loanLedger')} />
        <LedgerTable entries={ledgerEntries} asOfDate={asOf} />
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
  invoiceDocumentId,
  loanInvoiceDocumentNumber,
}: {
  detail: LoanDetailData;
  navigate: ReturnType<typeof useNavigate>;
  invoiceDocumentId?: string;
  loanInvoiceDocumentNumber?: string;
}) {
  const { t, language, tf } = useT();
  const {
    loan,
    customer,
    installments,
    guarantees,
    bike,
    ledgerPayments,
    ledgerInstallments,
    lateFeeExemptByInstallmentId,
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
        { asOfDate, lateFeeExemptByInstallmentId }
      ),
    [
      installmentsWithIds,
      loan.installmentAmount,
      loan.lateFeeRate,
      asOfDate,
      lateFeeExemptByInstallmentId,
    ]
  );

  const arrearsSummary = useMemo(
    () =>
      getFixedLoanArrearsSummary(
        installmentsWithIds,
        asOfDate,
        loan.lateFeeRate,
        loan.installmentAmount,
        lateFeeExemptByInstallmentId
      ),
    [
      installmentsWithIds,
      asOfDate,
      loan.lateFeeRate,
      loan.installmentAmount,
      lateFeeExemptByInstallmentId,
    ]
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
      ? t('statusCompleted')
      : nextFixed.dueDate
        ? formatDate(nextFixed.dueDate, 'short', language)
        : nextFixed.label === 'No due payments'
          ? t('noDuePayments')
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
        asOfDate,
        {
          loanOpeningRef:
            loanInvoiceDocumentNumber ?? loan.loanCode ?? null,
        }
      ),
    [
      loan.startDate,
      loan.totalPayable,
      loan.principalAmount,
      loan.loanCode,
      loanInvoiceDocumentNumber,
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
    return formatOverdueLabel(days, tf);
  }, [loan.status, installments, asOfDate, tf]);

  const settlementEligible = canRequestEarlySettlement(
    detail.monthsCompleted,
    loan.minimumMonthsBeforeSettlement
  );

  const isBikeInstallment = loan.loanPurpose === 'BIKE_INSTALLMENT';

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-5">
        <LoanDetailBackButton navigate={navigate} />
        <LoanHeader
          loan={loan}
          displayStatus={displayLoanStatus}
          customerName={customer.name}
          subtitle={`${formatEnum(loan.loanPurpose, language)} · ${formatEnum(loan.repaymentMethod, language)}`}
          actions={
            <LoanActionBar
              loanId={loan.id}
              navigate={navigate}
              showEarlySettlement
              settlementEligible={settlementEligible}
              monthsCompleted={detail.monthsCompleted}
              minimumMonths={loan.minimumMonthsBeforeSettlement}
              invoiceDocumentId={invoiceDocumentId}
            />
          }
        />
      </div>

      <LoanFinancialSummary
        loan={loan}
        nextDueLabel={nextDueLabel}
        termMonths={loan.termMonths}
        tf={tf}
      />

      {loan.status !== 'COMPLETED' && arrearsSummary.hasArrears && (
        <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            compact
            label={t('overdueAmountLive')}
            value={formatLKR(arrearsSummary.totalArrearsDue)}
          />
          <KpiCard
            compact
            label={t('lateFeeAccruedLabel')}
            value={formatLKR(lateFeeEngine.totalLateFee)}
          />
          <KpiCard
            compact
            label={t('lateFeePaid')}
            value={formatLKR(
              installments.reduce((sum, i) => sum + i.lateFeePaid, 0)
            )}
          />
          <KpiCard
            compact
            label={t('lateFeeRemainingLabel')}
            value={formatLKR(lateFeeEngine.totalLateFeeOutstanding)}
          />
        </div>
      )}

      {overdueLabel && (
        <div className="mb-4 rounded-lg bg-danger-50 border border-danger-200 px-4 py-2.5 text-sm font-medium text-danger-800">
          {overdueLabel}
        </div>
      )}

      {bike && isBikeInstallment && (
        <BikeInstallmentDetailsCard bike={bike} loan={loan} t={t} />
      )}

      {bike && !isBikeInstallment && (
        <div className="mb-5 rounded-xl bg-white px-4 py-3.5 ring-1 ring-neutral-200 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            {t('linkedBike')}
          </p>
          <p className="mt-0.5 font-semibold text-neutral-900">
            {formatBikeSelectLabel(bike, t('notRegistered'))}
          </p>
          <Link
            to={`/bikes/${bike.id}`}
            className="mt-1.5 inline-block text-sm font-medium text-brand-600 hover:text-brand-500"
          >
            {t('openBikeDetail')}
          </Link>
        </div>
      )}

      <LoanOriginationSection loan={loan} />

      <section className="mb-8">
        <SectionTitle icon={BanknoteIcon} title={t('loanLedger')} />
        <LedgerTable
          entries={ledgerEntries}
          asOfDate={asOfDate}
          lateFeeEngineLines={lateFeeEngine.lines}
        />
      </section>

      <GuaranteesSection
        guarantees={guarantees}
        loanId={loan.id}
        linkedBike={bike}
        navigate={navigate}
      />
    </div>
  );
}

function LoanFinancialSummary({
  loan,
  nextDueLabel,
  termMonths,
  tf,
}: {
  loan: Loan;
  nextDueLabel: string;
  termMonths?: number;
  tf: (
    key: LabelKey,
    params?: Record<string, string | number>
  ) => string;
}) {
  const { t } = useT();

  return (
    <section
      className="mb-5 rounded-xl border border-neutral-200/80 bg-gradient-to-b from-neutral-50/80 to-white p-2.5 sm:p-3"
      aria-label={t('totalLoanAmount')}
    >
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 sm:grid-cols-3 lg:grid-cols-5 mb-2 sm:mb-2.5">
        <KpiCard
          compact
          label={t('totalLoanAmount')}
          value={formatLKR(loan.totalPayable ?? 0)}
        />
        <KpiCard
          compact
          label={t('paidAmountLabel')}
          value={formatLKR(loan.paidAmount)}
        />
        <KpiCard
          compact
          label={t('remainingBalanceLabel')}
          value={
            loan.status === 'COMPLETED' || loan.balanceAmount <= 0
              ? formatLKR(0)
              : formatLKR(loan.balanceAmount)
          }
        />
        <KpiCard compact label={t('loanNextDue')} value={nextDueLabel} />
        <KpiCard
          compact
          label={t('loanTerm')}
          value={
            termMonths != null ? tf('termMonthsCount', { count: termMonths }) : '—'
          }
        />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:gap-2.5 sm:grid-cols-3">
        <KpiCard
          compact
          label={t('loanAmount')}
          value={formatLKR(loan.principalAmount)}
        />
        <KpiCard
          compact
          label={t('totalInterest')}
          value={formatLKR(loan.totalInterestAmount ?? 0)}
        />
        <KpiCard
          compact
          label={t('monthlyInstallment')}
          value={formatLKR(loan.installmentAmount ?? 0)}
        />
      </div>
    </section>
  );
}

function BikeInstallmentDetailsCard({
  bike,
  loan,
  t,
}: {
  bike: Bike;
  loan: Loan;
  t: (key: LabelKey) => string;
}) {
  const sellingPrice =
    loan.originalPrincipalAmount ?? bike.soldPrice ?? bike.sellingPrice;

  return (
    <section className="mb-5">
      <SectionTitle compact icon={BikeIcon} title={t('bikeDetails')} />
      <div className="flex flex-col gap-4 rounded-xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-neutral-200 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="min-w-0 lg:flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            {t('linkedBike')}
          </p>
          <p className="mt-0.5 text-base font-semibold text-neutral-900">
            {formatBikeSelectLabel(bike, t('notRegistered'))}
          </p>
          <Link
            to={`/bikes/${bike.id}`}
            className="mt-1.5 inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-500"
          >
            {t('openBikeDetail')}
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3 border-t border-neutral-100 pt-3 lg:min-w-[min(100%,28rem)] lg:flex-shrink-0 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6 lg:gap-5">
          <BikeDetailStat
            label={t('sellingPriceLabel')}
            value={formatLKR(sellingPrice)}
          />
          <BikeDetailStat
            label={t('downPaymentLabel')}
            value={formatLKR(loan.initialPayment ?? 0)}
          />
          <BikeDetailStat
            label={t('loanAmount')}
            value={formatLKR(loan.principalAmount)}
          />
        </div>
      </div>
    </section>
  );
}

function BikeDetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 leading-snug">
        {label}
      </p>
      <p className="mt-0.5 text-base font-semibold tabular-nums text-neutral-900 leading-tight">
        {value}
      </p>
    </div>
  );
}

function LoanDetailBackButton({
  navigate,
}: {
  navigate: ReturnType<typeof useNavigate>;
}) {
  const { t } = useT();
  return (
    <button
      type="button"
      onClick={() => navigate('/loans')}
      className="mb-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-neutral-500 ring-1 ring-transparent transition-colors hover:bg-neutral-100 hover:text-neutral-700 hover:ring-neutral-200/80"
    >
      <ArrowLeftIcon className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
      {t('backToLoans')}
    </button>
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
    <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
  invoiceDocumentId,
}: {
  loanId: string;
  navigate: ReturnType<typeof useNavigate>;
  showEarlySettlement: boolean;
  settlementEligible?: boolean;
  monthsCompleted: number;
  minimumMonths: number;
  invoiceDocumentId?: string;
}) {
  const { t, tf, language } = useT();
  const viewInvoiceLabel = getDocumentLabel('viewInvoice', language);

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        {invoiceDocumentId && (
          <ActionButton
            onClick={() => navigate(`/documents/${invoiceDocumentId}`)}
          >
            {viewInvoiceLabel}
          </ActionButton>
        )}
        <ActionButton
          primary
          onClick={() => navigate(`/payments/new?loanId=${loanId}`)}
        >
          {t('recordPaymentAction')}
        </ActionButton>
        {showEarlySettlement && (
          <ActionButton
            disabled={!settlementEligible}
            onClick={() => navigate(`/loans/${loanId}/early-settlement`)}
          >
            {t('earlySettlement')}
          </ActionButton>
        )}
      </div>
      {showEarlySettlement && !settlementEligible && (
        <p className="text-xs text-neutral-500 max-w-xs sm:text-right">
          {tf('earlySettlementMonthsRequired', { months: minimumMonths })}
          {monthsCompleted > 0 &&
            ` ${tf('earlySettlementMonthsProgress', { completed: monthsCompleted })}`}
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
  compact = false,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  compact?: boolean;
}) {
  return (
    <h2
      className={`flex items-center gap-2 font-semibold text-neutral-900 ${
        compact ? 'mb-2.5 text-base' : 'mb-4 text-lg'
      }`}
    >
      <Icon
        className={`text-brand-600 ${compact ? 'h-4 w-4' : 'h-5 w-5'}`}
      />
      {title}
    </h2>
  );
}

function GuaranteeStatusBadge({ status }: { status: Guarantee['status'] }) {
  const { t } = useT();
  const labelKey =
    status === 'returned' ? 'guaranteeStatusReleased' : 'guaranteeStatusHeld';
  return (
    <span className="inline-flex rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-800 ring-1 ring-inset ring-neutral-200">
      {t(labelKey)}
    </span>
  );
}

function GuaranteesSection({
  guarantees,
  loanId,
  linkedBike,
  navigate,
}: {
  guarantees: Guarantee[];
  loanId: string;
  linkedBike?: import('../../types/entities').Bike;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const { t, language } = useT();

  return (
    <section>
      <SectionTitle icon={ShieldIcon} title={t('guarantees')} />
      {guarantees.length === 0 ? (
        <EmptyState
          icon={FileTextIcon}
          title={t('noGuarantees')}
          description={t('noGuaranteesOnLoanHint')}
          action={
            <button
              type="button"
              onClick={() => navigate(`/guarantees/new?loanId=${loanId}`)}
              className="mt-4 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
            >
              {t('addGuarantee')}
            </button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {guarantees.map((g) => {
            const lines = guaranteeDetailLines(g, t);
            return (
              <li
                key={g.id}
                className="rounded-xl bg-white p-4 ring-1 ring-neutral-200 shadow-sm"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="text-xs text-neutral-500 tabular-nums">
                      {g.fileNumber || g.guaranteeCode}
                      {g.vehicleNumber || g.itemReference
                        ? ` · ${g.vehicleNumber ?? g.itemReference}`
                        : ''}
                    </p>
                    {linkedBike && (
                      <div className="mt-2">
                        <LinkedBikeSummary bike={linkedBike} />
                      </div>
                    )}
                  </div>
                  <GuaranteeStatusBadge status={g.status} />
                </div>
                {lines.length > 0 && (
                  <dl className="mt-2 space-y-1 text-sm text-neutral-600">
                    {lines.map((line) => (
                      <div key={`${line.label}-${line.value}`}>
                        <dt className="inline text-neutral-500 after:content-[':']">
                          {line.label}
                        </dt>{' '}
                        <dd className="inline">{line.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {g.status === 'returned' && g.releasedAt && (
                  <p className="mt-2 text-xs text-neutral-500">
                    {t('guaranteeReleasedDate')}:{' '}
                    {formatDate(g.releasedAt, 'short', language)}
                  </p>
                )}
                {g.status === 'held' && (
                  <p className="mt-1 text-xs text-neutral-500">
                    {t('guaranteeReceivedOn')}{' '}
                    {formatDate(g.receivedAt, 'short', language)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function LoanOriginationSection({ loan }: { loan: Loan }) {
  const { t, language } = useT();
  const db = useDemoDb();
  const originationTxns = listCashTransactionsForLoan(loan.id, db);
  const isBikeInstallment = loan.loanPurpose === 'BIKE_INSTALLMENT';
  const showOrigination =
    (loan.initialPayment ?? 0) > 0 ||
    (loan.netAdvancePayment ?? 0) > 0 ||
    originationTxns.length > 0;
  if (!showOrigination) return null;

  const grossAmountLabel = isBikeInstallment
    ? t('sellingPriceLabel')
    : t('loanAmountField');
  const initialPaidLabel = isBikeInstallment
    ? t('downPaymentLabel')
    : t('initialPayment');

  return (
    <section className="mb-6">
      <SectionTitle compact icon={BanknoteIcon} title={t('originationPaymentSection')} />
      <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl overflow-hidden">
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 text-sm border-b border-neutral-200">
          <div>
            <dt className="text-neutral-500">{grossAmountLabel}</dt>
            <dd className="font-semibold tabular-nums">
              {formatLKR(loan.originalPrincipalAmount ?? loan.principalAmount)}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">{initialPaidLabel}</dt>
            <dd className="font-semibold tabular-nums">
              {formatLKR(loan.initialPayment ?? 0)}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">{t('serviceFee')}</dt>
            <dd className="font-semibold tabular-nums">
              {formatLKR(loan.serviceFee ?? 0)}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">{t('registrationFee')}</dt>
            <dd className="font-semibold tabular-nums">
              {formatLKR(loan.registrationFee ?? 0)}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">{t('netAdvancePayment')}</dt>
            <dd className="font-semibold tabular-nums">
              {formatLKR(loan.netAdvancePayment ?? 0)}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">
              {isBikeInstallment ? t('loanAmount') : t('financedPrincipal')}
            </dt>
            <dd className="font-semibold tabular-nums">
              {formatLKR(loan.principalAmount)}
            </dd>
          </div>
        </dl>
        {originationTxns.length > 0 && (
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="py-2 pl-4 text-left font-semibold text-neutral-900">
                  {t('csvReference')}
                </th>
                <th className="py-2 px-3 text-left font-semibold text-neutral-900">
                  {t('csvIncomeType')}
                </th>
                <th className="py-2 px-3 text-left font-semibold text-neutral-900">
                  {t('field.date')}
                </th>
                <th className="py-2 pr-4 text-right font-semibold text-neutral-900">
                  {t('colAmount')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {originationTxns.map((txn) => (
                <tr key={txn.id}>
                  <td className="py-2 pl-4 tabular-nums">{txn.transactionCode}</td>
                  <td className="py-2 px-3">
                    {formatEnum(txn.transactionType, language)}
                  </td>
                  <td className="py-2 px-3 tabular-nums">
                    {formatDate(txn.transactionDate, 'short', language)}
                  </td>
                  <td className="py-2 pr-4 text-right font-medium tabular-nums">
                    {formatLKR(txn.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

