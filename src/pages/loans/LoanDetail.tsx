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
import { useT } from '../../i18n/I18nProvider';
import { getNextDueDateForFixedInstallments } from '../../lib/finance/loanNextDue';
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

  const detail =
    (id ? getLoanDetailFromDb(id, db) : null) ?? resolveLoanDetailPreview(id);
  const demoLinks = listLoanDetailLinks(db);
  const loanInvoiceDoc = id ? findLoanCreationDocument(db, id) : undefined;

  if (!detail) {
    return (
      <div className="max-w-3xl mx-auto pt-8">
        <EmptyState
          icon={AlertCircleIcon}
          title={t('loanNotFound')}
          description={t('chooseDemoLoanBelow')}
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

  const financeLabel =
    loan.loanPurpose === 'BIKE_INSTALLMENT'
      ? t('financeAmount')
      : t('loanAmount');

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-6">
        <KpiCard
          label={financeLabel}
          value={formatLKR(loan.principalAmount)}
        />
        <KpiCard
          label={t('totalInterest')}
          value={formatLKR(loan.totalInterestAmount ?? 0)}
        />
        <KpiCard
          label={t('totalPayable')}
          value={formatLKR(loan.totalPayable ?? 0)}
        />
        <KpiCard label={t('paid')} value={formatLKR(loan.paidAmount)} />
        <KpiCard label={t('loanBalance')} value={formatLKR(loan.balanceAmount)} />
        <KpiCard
          label={
            language === 'si'
              ? t('monthlyInstallmentShort')
              : t('monthlyInstallment')
          }
          value={formatLKR(loan.installmentAmount ?? 0)}
        />
      </div>

      {bike && (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3 rounded-xl bg-white p-5 ring-1 ring-neutral-200 shadow-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              {t('linkedBike')}
            </p>
            <p className="mt-1 font-semibold text-neutral-900">{bike.model}</p>
            <p className="text-sm text-neutral-600">
              {tf('bikeStockRefEngine', {
                code: bike.bikeCode,
                engine: bike.engineNo,
              })}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              {t('loanAmountField')}
            </p>
            <p className="mt-1 tabular-nums font-semibold text-neutral-900">
              {formatLKR(loan.originalPrincipalAmount ?? bike.sellingPrice)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              {t('financedPrincipal')}
            </p>
            <p className="mt-1 tabular-nums font-semibold text-neutral-900">
              {formatLKR(loan.principalAmount)}
            </p>
          </div>
          <div className="sm:col-span-3">
            <Link
              to={`/bikes/${bike.id}`}
              className="text-sm font-semibold text-brand-600 hover:text-brand-500"
            >
              {t('openBikeDetail')}
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <KpiCard
          label={t('loanTerm')}
          value={
            loan.termMonths != null
              ? tf('termMonthsCount', { count: loan.termMonths })
              : '—'
          }
        />
        <KpiCard label={t('loanNextDue')} value={nextDueLabel} />
        <KpiCard
          label={t('loanBalance')}
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
            label={t('overdueAmountLive')}
            value={formatLKR(arrearsSummary.totalArrearsDue)}
          />
          <KpiCard
            label={t('lateFeeAccruedLabel')}
            value={formatLKR(lateFeeEngine.totalLateFee)}
          />
          <KpiCard
            label={t('lateFeePaid')}
            value={formatLKR(
              installments.reduce((sum, i) => sum + i.lateFeePaid, 0)
            )}
          />
          <KpiCard
            label={t('lateFeeRemainingLabel')}
            value={formatLKR(lateFeeEngine.totalLateFeeOutstanding)}
          />
        </div>
      )}

      {overdueLabel && (
        <div className="mb-6 rounded-lg bg-danger-50 border border-danger-200 px-4 py-3 text-sm font-medium text-danger-800">
          {overdueLabel}
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
  const printInvoiceLabel = getDocumentLabel('printInvoice', language);

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        {invoiceDocumentId && (
          <>
            <ActionButton
              onClick={() => navigate(`/documents/${invoiceDocumentId}`)}
            >
              {viewInvoiceLabel}
            </ActionButton>
            <ActionButton
              onClick={() =>
                navigate(`/documents/${invoiceDocumentId}?print=1`)
              }
            >
              {printInvoiceLabel}
            </ActionButton>
          </>
        )}
        <ActionButton
          primary
          onClick={() => navigate(`/payments/new?loanId=${loanId}`)}
        >
          {t('recordPaymentAction')}
        </ActionButton>
        <ActionButton onClick={() => navigate(`/guarantees/new?loanId=${loanId}`)}>
          {t('addGuarantee')}
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
  const showOrigination =
    (loan.initialPayment ?? 0) > 0 ||
    (loan.netAdvancePayment ?? 0) > 0 ||
    originationTxns.length > 0;
  if (!showOrigination) return null;

  return (
    <section className="mb-8">
      <SectionTitle icon={BanknoteIcon} title={t('originationPaymentSection')} />
      <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl overflow-hidden">
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 text-sm border-b border-neutral-200">
          <div>
            <dt className="text-neutral-500">{t('loanAmountField')}</dt>
            <dd className="font-semibold tabular-nums">
              {formatLKR(loan.originalPrincipalAmount ?? loan.principalAmount)}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">{t('initialPayment')}</dt>
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
            <dt className="text-neutral-500">{t('financedPrincipal')}</dt>
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

