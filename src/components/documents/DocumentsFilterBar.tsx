import type {
  DocumentSortOrder,
  DocumentTypeFilter,
} from '../../lib/documents/documentRegistryTypes';
import type { LabelKey } from '../../lib/i18n/simpleLabels';
import { useT } from '../../i18n/I18nProvider';

interface DocumentsFilterBarProps {
  typeFilter: DocumentTypeFilter;
  onTypeFilterChange: (value: DocumentTypeFilter) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  sort: DocumentSortOrder;
  onSortChange: (value: DocumentSortOrder) => void;
}

const TYPE_FILTERS: DocumentTypeFilter[] = [
  'all',
  'loan_invoices',
  'payment_receipts',
  'cash_sales',
  'bike_purchases',
];

const TYPE_FILTER_LABELS: Record<DocumentTypeFilter, LabelKey> = {
  all: 'docFilterAll',
  loan_invoices: 'docFilterLoanInvoices',
  payment_receipts: 'docFilterPaymentReceipts',
  cash_sales: 'docFilterCashSales',
  bike_purchases: 'docFilterBikePurchases',
};

const selectClass =
  'block rounded-md border-0 py-1.5 pl-3 pr-8 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6 bg-white';

export function DocumentsFilterBar({
  typeFilter,
  onTypeFilterChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  sort,
  onSortChange,
}: DocumentsFilterBarProps) {
  const { t } = useT();

  return (
    <div className="flex flex-col gap-3 mb-4">
      <div className="flex flex-wrap gap-1.5">
        {TYPE_FILTERS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onTypeFilterChange(key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              typeFilter === key
                ? 'bg-neutral-800 text-white'
                : 'bg-white text-neutral-700 ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50'
            }`}
          >
            {t(TYPE_FILTER_LABELS[key])}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <span className="whitespace-nowrap">{t('docDateFrom')}</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className={selectClass}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <span className="whitespace-nowrap">{t('docDateTo')}</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className={selectClass}
          />
        </label>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as DocumentSortOrder)}
          className={selectClass}
          aria-label={t('docSortOrder')}
        >
          <option value="newest">{t('docSortNewest')}</option>
          <option value="oldest">{t('docSortOldest')}</option>
        </select>
      </div>
    </div>
  );
}
