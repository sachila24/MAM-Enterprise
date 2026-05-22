import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  BanknoteIcon,
  CreditCardIcon,
  ReceiptTextIcon,
  AlertCircleIcon,
  BikeIcon,
  PhoneIcon,
  CalendarClockIcon,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { KpiCard } from '../components/ui/KpiCard';
import { formatLKR, formatDateTime } from '../lib/format';
import { useDemoDb } from '../lib/local-db/useDemoDb';
import {
  getDashboardKpis,
  getOverdueLoans,
  getRecentActivity,
  type DashboardOverdueLoan,
} from '../lib/local-db/repositories';
import { useT } from '../i18n/I18nProvider';
import { getGreetingPeriod, getSystemTime } from '../lib/time/systemTime';
import { formatOverdueHuman } from '../lib/display/ledgerDisplay';

function greetingKey(
  period: ReturnType<typeof getGreetingPeriod>
): 'goodMorning' | 'goodAfternoon' | 'goodEvening' {
  if (period === 'afternoon') return 'goodAfternoon';
  if (period === 'evening') return 'goodEvening';
  return 'goodMorning';
}

export function Dashboard() {
  const { t, language } = useT();
  const db = useDemoDb();
  const kpis = useMemo(() => getDashboardKpis(db), [db]);
  const overdueLoans = useMemo(() => getOverdueLoans(db), [db]);
  const recentActivity = useMemo(
    () => getRecentActivity(db, 10, language),
    [db, language]
  );

  const headerSubtitle = useMemo(() => {
    const now = getSystemTime();
    const period = getGreetingPeriod(now);
    const greeting = `${t(greetingKey(period))}, Sachila`;
    const timestamp = formatDateTime(now);
    return `${greeting} — ${timestamp}`;
  }, [t]);

  const quickActions = (
    <div className="flex gap-2">
      <Link
        to="/customers/new"
        className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50"
      >
        <PlusIcon
          className="-ml-0.5 h-4 w-4 text-neutral-400"
          aria-hidden="true"
        />
        {t('nav.customers')}
      </Link>
      <Link
        to="/loans/new"
        className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50"
      >
        <BanknoteIcon
          className="-ml-0.5 h-4 w-4 text-neutral-400"
          aria-hidden="true"
        />
        {t('field.loan')}
      </Link>
      <Link
        to="/payments/new"
        className="inline-flex items-center gap-x-1.5 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        <CreditCardIcon className="-ml-0.5 h-4 w-4" aria-hidden="true" />
        {t('stepPayment')}
      </Link>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <PageHeader title={t('dashboard')} subtitle={headerSubtitle} />
        <div className="mt-4 sm:mt-0 pb-6">{quickActions}</div>
      </div>

      <div>
        <h2 className="text-base font-semibold leading-6 text-neutral-900 mb-4">
          {t('today')}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label={t('todayCollectionsExpected')}
            value={formatLKR(kpis.todayExpectedCollections)}
            icon={CalendarClockIcon}
          />
          <KpiCard
            label={t('activeOverduesToday')}
            value={kpis.overdueCount}
            icon={AlertCircleIcon}
            delta={
              kpis.overdueCount > 0
                ? {
                    value: t('needsAttention'),
                    trend: 'down',
                  }
                : undefined
            }
          />
          <KpiCard
            label={t('paymentsReceivedToday')}
            value={kpis.todayPaymentsCount}
            icon={CreditCardIcon}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl overflow-hidden">
            <div className="border-b border-neutral-200 px-4 py-5 sm:px-6 flex justify-between items-center bg-danger-50/50">
              <h3 className="text-base font-semibold leading-6 text-danger-900 flex items-center gap-2">
                <AlertCircleIcon className="h-5 w-5 text-danger-600" />
                {t('overdueQueue')}
              </h3>
              <Link
                to="/loans"
                className="text-sm font-medium text-brand-600 hover:text-brand-500"
              >
                {t('action.viewAll')}
              </Link>
            </div>
            <ul role="list" className="divide-y divide-neutral-200">
              {overdueLoans.map((loan) => (
                <OverdueQueueRow key={loan.id} loan={loan} t={t} />
              ))}
              {overdueLoans.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-neutral-500">
                  {t('noOverdueLoans')}
                </li>
              )}
            </ul>
          </div>

          <div>
            <h2 className="text-base font-semibold leading-6 text-neutral-900 mb-4">
              {t('bikeStockStatus')}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="overflow-hidden rounded-xl bg-white px-4 py-5 shadow-sm ring-1 ring-neutral-200">
                <dt className="truncate text-sm font-medium text-neutral-500 uppercase tracking-wider">
                  {t('inStock')}
                </dt>
                <dd className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 tabular-nums">
                  {kpis.inStockCount}
                </dd>
              </div>
              <div className="overflow-hidden rounded-xl bg-white px-4 py-5 shadow-sm ring-1 ring-neutral-200">
                <dt className="truncate text-sm font-medium text-neutral-500 uppercase tracking-wider">
                  {t('soldThisMonth')}
                </dt>
                <dd className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 tabular-nums">
                  {kpis.soldThisMonth}
                </dd>
              </div>
              <div className="overflow-hidden rounded-xl bg-white px-4 py-5 shadow-sm ring-1 ring-neutral-200 flex items-center justify-center">
                <Link
                  to="/bikes/new"
                  className="text-sm font-medium text-brand-600 hover:text-brand-500 flex items-center gap-1"
                >
                  <PlusIcon className="h-4 w-4" /> {t('addBikeLink')}
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl overflow-hidden h-full">
            <div className="border-b border-neutral-200 px-4 py-5 sm:px-6 flex justify-between items-center">
              <h3 className="text-base font-semibold leading-6 text-neutral-900">
                {t('recentActivity')}
              </h3>
              <Link
                to="/activity"
                className="text-sm font-medium text-brand-600 hover:text-brand-500"
              >
                {t('action.viewAll')}
              </Link>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="flow-root">
                <ul role="list" className="-mb-8">
                  {recentActivity.length === 0 && (
                    <li className="py-4 text-center text-sm text-neutral-500">
                      {t('noRecentActivity')}
                    </li>
                  )}
                  {recentActivity.map((activity, activityIdx) => (
                    <li key={activity.id}>
                      <div className="relative pb-8">
                        {activityIdx !== recentActivity.length - 1 ? (
                          <span
                            className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-neutral-200"
                            aria-hidden="true"
                          />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center ring-8 ring-white">
                              {activity.type === 'payment' && (
                                <CreditCardIcon className="h-4 w-4 text-success-600" />
                              )}
                              {activity.type === 'loan' && (
                                <BanknoteIcon className="h-4 w-4 text-brand-600" />
                              )}
                              {activity.type === 'bike' && (
                                <BikeIcon className="h-4 w-4 text-info-600" />
                              )}
                              {activity.type === 'customer' && (
                                <PlusIcon className="h-4 w-4 text-neutral-600" />
                              )}
                              {activity.type === 'guarantee' && (
                                <ReceiptTextIcon className="h-4 w-4 text-warning-600" />
                              )}
                            </span>
                          </div>
                          <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                            <div>
                              <p className="text-sm text-neutral-900 font-medium">
                                {activity.action}
                              </p>
                              <p className="text-sm text-neutral-500">
                                {activity.summary}
                              </p>
                            </div>
                            <div className="whitespace-nowrap text-right text-xs text-neutral-500">
                              <time dateTime={activity.when}>
                                {formatDateTime(activity.when).split(',')[1]}
                              </time>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverdueQueueRow({
  loan,
  t,
}: {
  loan: DashboardOverdueLoan;
  t: ReturnType<typeof useT>['t'];
}) {
  return (
    <li className="px-4 py-4 sm:px-6 hover:bg-neutral-50">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col min-w-0">
          <p className="text-sm font-medium text-neutral-900 truncate">
            {loan.customer?.name}
          </p>
          <p className="text-sm text-neutral-500 mt-1">
            <span className="tabular-nums font-medium text-neutral-700">
              {loan.loanCode}
            </span>
          </p>
          <p className="text-sm text-danger-600 font-medium mt-1">
            {formatOverdueHuman(loan.daysOverdue)}
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className="text-sm font-semibold text-neutral-900 tabular-nums">
              {formatLKR(loan.balanceAmount)}
            </p>
            <p className="text-xs text-neutral-500 mt-1">{t('field.balance')}</p>
          </div>
          <div className="flex gap-2">
            <a
              href={`tel:${loan.customer?.phone}`}
              className="rounded-full bg-white p-2 text-neutral-400 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50"
              title="Call customer"
            >
              <PhoneIcon className="h-4 w-4" />
            </a>
            <Link
              to={`/payments/new?loanId=${loan.id}`}
              className="rounded-full bg-white p-2 text-brand-600 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-brand-50"
              title="Record payment"
            >
              <CreditCardIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}
