import React, { useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BikeIcon, EditIcon, CheckIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusChip } from '../../components/ui/StatusChip';
import { KpiCard } from '../../components/ui/KpiCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import { formatLKR, formatDate } from '../../lib/format';
import { useDemoDb } from '../../lib/local-db/useDemoDb';
import {
  attachBikeToLoan,
  bikeProfit,
  getBike,
  getLoan,
  listLoans,
  markBikeSold,
} from '../../lib/local-db/repositories';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { useT } from '../../i18n/I18nProvider';
import { findCashSaleDocumentForBike } from '../../lib/documents/documentService';
import { getDocumentLabel } from '../../lib/i18n/documentLabels';

export function BikeDetail() {
  const { t, language } = useT();
  const { id } = useParams();
  const navigate = useNavigate();
  const db = useDemoDb();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'loans'>(
    'overview'
  );
  const [soldOpen, setSoldOpen] = useState(false);
  const [linkLoanId, setLinkLoanId] = useState('');
  const [soldPrice, setSoldPrice] = useState(0);
  const [soldRepairCost, setSoldRepairCost] = useState(0);
  const [soldOtherCost, setSoldOtherCost] = useState(0);
  const [isSavingSold, setIsSavingSold] = useState(false);
  const isSavingSoldRef = useRef(false);

  const bike = id ? getBike(id, db) : undefined;
  const loans = listLoans(db);

  const linkedLoans = useMemo(
    () => loans.filter((l) => l.bikeId === bike?.id),
    [loans, bike?.id]
  );

  const saleLoan = useMemo(() => {
    if (!bike?.soldLoanId) return undefined;
    return getLoan(bike.soldLoanId, db);
  }, [bike?.soldLoanId, db]);

  const cashSaleDoc = useMemo(
    () => (bike?.id ? findCashSaleDocumentForBike(db, bike.id) : undefined),
    [db, bike?.id]
  );

  const linkableLoans = useMemo(() => {
    if (!bike?.id) return [];
    return loans.filter(
      (l) =>
        l.status === 'ACTIVE' &&
        l.loanPurpose === 'BIKE_INSTALLMENT' &&
        (!l.bikeId || l.bikeId === bike.id)
    );
  }, [loans, bike?.id]);

  if (!bike) {
    return (
      <div className="max-w-7xl mx-auto">
        <EmptyState
          icon={BikeIcon}
          title={t('bikeNotFound')}
          description={t('bikeNotFound')}
        />
      </div>
    );
  }

  const profit = bike.status === 'sold' ? bikeProfit(bike) : 0;
  const displayReg = bike.registrationNo || bike.chassisNo;

  const handleMarkSold = () => {
    if (isSavingSoldRef.current) return;
    if (bike.status !== 'in_stock' || soldPrice <= 0) {
      showToast(t('enterValidSoldPrice'), 'error');
      return;
    }
    isSavingSoldRef.current = true;
    setIsSavingSold(true);
    try {
      const updated = markBikeSold(
        bike.id,
        {
          soldPrice,
          repairCost: soldRepairCost,
          otherCost: soldOtherCost,
          loanId: linkLoanId || undefined,
        },
        db
      );
      if (!updated) {
        throw new Error(t('couldNotUpdateBike'));
      }
      if (linkLoanId) {
        attachBikeToLoan(linkLoanId, bike.id, db);
      }
      showToast(`${bike.bikeCode} ${t('bikeMarkedSold')}`, 'success');
      setSoldOpen(false);
      setLinkLoanId('');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('couldNotUpdateBike');
      showToast(message, 'error');
      isSavingSoldRef.current = false;
      setIsSavingSold(false);
    }
  };

  const tabs = [
    { id: 'overview', label: t('tabOverview') },
    { id: 'history', label: t('tabHistory') },
    { id: 'loans', label: t('tabLinkedLoans') },
  ];

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <PageHeader
        title={bike.model}
        subtitle={
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs font-semibold text-brand-700 tabular-nums">
              {bike.bikeCode}
            </span>
            <StatusChip status={bike.status} />
          </div>
        }
        actions={
          <>
            {bike.status === 'in_stock' && (
              <button
                type="button"
                onClick={() => {
                  setSoldPrice(bike.sellingPrice);
                  setSoldRepairCost(bike.repairCost);
                  setSoldOtherCost(bike.otherCost);
                  setSoldOpen(true);
                }}
                className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50"
              >
                <CheckIcon className="-ml-0.5 h-4 w-4 text-success-600" />
                {t('markAsSold')}
              </button>
            )}
            {cashSaleDoc && !saleLoan && (
              <>
                <button
                  type="button"
                  onClick={() => navigate(`/documents/${cashSaleDoc.id}`)}
                  className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-brand-700 shadow-sm ring-1 ring-inset ring-brand-200 hover:bg-brand-50"
                >
                  {getDocumentLabel('viewInvoice', language)}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/documents/${cashSaleDoc.id}?print=1`)
                  }
                  className="inline-flex items-center gap-x-1.5 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500"
                >
                  {getDocumentLabel('printInvoice', language)}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => navigate(`/bikes/${bike.id}/edit`)}
              className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50"
            >
              <EditIcon className="-ml-0.5 h-4 w-4 text-neutral-400" />
              {t('action.edit')}
            </button>
          </>
        }
      />

      {saleLoan && bike.status === 'sold' && (
        <div className="mb-6 rounded-xl bg-brand-50 ring-1 ring-brand-100 p-4 text-sm">
          <p className="font-semibold text-brand-900 mb-1">{t('soldViaLoan')}</p>
          <Link
            to={`/loans/${saleLoan.id}`}
            className="font-semibold text-brand-600 hover:text-brand-500 tabular-nums"
          >
            {saleLoan.loanCode}
          </Link>
          <p className="text-brand-800 mt-2 tabular-nums">
            {t('principalFinanced')}:{' '}
            <span className="font-medium">{formatLKR(saleLoan.principalAmount)}</span>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <KpiCard
          label={bike.status === 'sold' ? t('soldPriceLabel') : t('listPrice')}
          value={formatLKR(
            bike.status === 'sold'
              ? (bike.soldPrice ?? bike.sellingPrice)
              : bike.sellingPrice
          )}
        />
        <KpiCard label={t('boughtPriceLabel')} value={formatLKR(bike.costPrice)} />
        {bike.status === 'sold' ? (
          <KpiCard
            label={t('profitLabel')}
            value={formatLKR(profit)}
            delta={{
              value: `${bike.costPrice > 0 ? Math.round((profit / bike.costPrice) * 100) : 0}%`,
              trend: profit > 0 ? 'up' : 'neutral',
            }}
          />
        ) : (
          <KpiCard
            label={t('repairAndOther')}
            value={formatLKR(bike.repairCost + bike.otherCost)}
          />
        )}
        <KpiCard
          label={bike.status === 'sold' ? t('soldDateLabel') : t('purchaseDateLabel')}
          value={
            bike.status === 'sold' && bike.soldDate
              ? formatDate(bike.soldDate)
              : formatDate(bike.purchaseDate)
          }
        />
      </div>

      <div className="border-b border-neutral-200 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`
                whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium
                ${
                  activeTab === tab.id
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="aspect-square bg-neutral-100 rounded-xl flex items-center justify-center border border-neutral-200">
              <BikeIcon className="h-24 w-24 text-neutral-300" />
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl overflow-hidden">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-base font-semibold leading-6 text-neutral-900 mb-4">
                  {t('bikeDetails')}
                </h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                  <div>
                    <dt className="text-sm font-medium text-neutral-500">
                      {t('registrationLabel')}
                    </dt>
                    <dd className="mt-1 text-sm text-neutral-900 font-mono">
                      {displayReg}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-neutral-500">
                      {t('chassisLabel')}
                    </dt>
                    <dd className="mt-1 text-sm text-neutral-900 font-mono">
                      {bike.chassisNo}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-neutral-500">
                      {t('engineLabel')}
                    </dt>
                    <dd className="mt-1 text-sm text-neutral-900 font-mono">
                      {bike.engineNo}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-neutral-500">{t('yearLabel')}</dt>
                    <dd className="mt-1 text-sm text-neutral-900">{bike.year}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-neutral-500">{t('colorLabel')}</dt>
                    <dd className="mt-1 text-sm text-neutral-900">{bike.color}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl p-6">
          <div className="flow-root">
            <ul role="list" className="-mb-8">
              <li>
                <div className="relative pb-8">
                  <span
                    className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-neutral-200"
                    aria-hidden="true"
                  />
                  <div className="relative flex space-x-3">
                    <div>
                      <span className="h-8 w-8 rounded-full bg-brand-50 flex items-center justify-center ring-8 ring-white">
                        <BikeIcon className="h-4 w-4 text-brand-600" />
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                      <p className="text-sm text-neutral-500">{t('addedToStockHistory')}</p>
                      <p className="whitespace-nowrap text-right text-sm text-neutral-500 tabular-nums">
                        {formatDate(bike.purchaseDate)}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
              {bike.status === 'sold' && bike.soldDate && (
                <li>
                  <div className="relative pb-8">
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-success-50 flex items-center justify-center ring-8 ring-white">
                          <CheckIcon className="h-4 w-4 text-success-600" />
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                        <p className="text-sm text-neutral-500">{t('markedAsSoldHistory')}</p>
                        <p className="whitespace-nowrap text-right text-sm text-neutral-500 tabular-nums">
                          {formatDate(bike.soldDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'loans' && (
        <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl overflow-hidden">
          {linkedLoans.length > 0 ? (
            <ul role="list" className="divide-y divide-neutral-200">
              {linkedLoans.map((loan) => (
                <li
                  key={loan.id}
                  className="px-4 py-4 sm:px-6 hover:bg-neutral-50 cursor-pointer"
                  onClick={() => navigate(`/loans/${loan.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <p className="text-sm font-semibold text-brand-600 tabular-nums">
                        {loan.loanCode}
                      </p>
                      <p className="mt-1 text-sm text-neutral-500 tabular-nums">
                        {formatDate(loan.startDate)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <StatusChip status={loan.status} />
                      <p className="mt-1 text-sm font-medium text-neutral-900 tabular-nums">
                        {formatLKR(loan.balanceAmount)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center text-sm text-neutral-500">
              {t('noInstallmentLoanLinked')}
            </div>
          )}
        </div>
      )}

      {soldOpen && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl ring-1 ring-neutral-200"
          >
            <h3 className="text-lg font-semibold text-neutral-900">
              {bike.bikeCode} — {t('markSoldConfirmTitle')}
            </h3>
            <p className="mt-2 text-sm text-neutral-600">
              {t('markSoldHint')}
            </p>
            <div className="mt-4 space-y-4">
              <CurrencyInput
                label={`${t('soldPriceLabel')} *`}
                value={soldPrice}
                onChange={setSoldPrice}
              />
              <CurrencyInput
                label={t('repairCost')}
                value={soldRepairCost}
                onChange={setSoldRepairCost}
              />
              <CurrencyInput
                label={t('otherCost')}
                value={soldOtherCost}
                onChange={setSoldOtherCost}
              />
            </div>
            <label className="mt-4 block text-xs font-semibold text-neutral-700 mb-1">
              {t('linkLoanOptional')}
            </label>
            <select
              value={linkLoanId}
              onChange={(e) => setLinkLoanId(e.target.value)}
              className="block w-full rounded-md border-0 py-2 pl-3 pr-8 text-sm ring-1 ring-inset ring-neutral-300 bg-white"
            >
              <option value="">{t('noLoanLink')}</option>
              {linkableLoans.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.loanCode}
                </option>
              ))}
            </select>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSoldOpen(false);
                  setLinkLoanId('');
                }}
                disabled={isSavingSold}
                className="rounded-md px-3 py-2 text-sm font-semibold text-neutral-800 ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 disabled:opacity-50"
              >
                {t('action.cancel')}
              </button>
              <button
                type="button"
                onClick={handleMarkSold}
                disabled={isSavingSold}
                className="rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-50 min-w-[7.5rem]"
              >
                {isSavingSold ? t('savingGeneric') : t('confirmSold')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

