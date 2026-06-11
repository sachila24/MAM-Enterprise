import { Link } from 'react-router-dom';
import { formatDate, formatLKR } from '../../lib/format';
import type { DocumentListRow } from '../../lib/documents/documentDisplay';
import { printStatusLabel } from '../../lib/documents/documentDisplay';
import { useT } from '../../i18n/I18nProvider';
import { DocumentRowActions } from './DocumentRowActions';

interface DocumentsTableProps {
  rows: DocumentListRow[];
  emptyMessage: string;
}

export function DocumentsTable({ rows, emptyMessage }: DocumentsTableProps) {
  const { t, language } = useT();

  return (
    <div className="bg-white shadow-sm ring-1 ring-neutral-200 sm:rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200 text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="py-3 pl-4 pr-3 text-left font-semibold text-neutral-900 sm:pl-6">
                {t('docColNumber')}
              </th>
              <th className="px-3 py-3 text-left font-semibold text-neutral-900">
                {t('docColType')}
              </th>
              <th className="px-3 py-3 text-left font-semibold text-neutral-900">
                {t('field.customer')}
              </th>
              <th className="px-3 py-3 text-left font-semibold text-neutral-900">
                {t('docColLoanNumber')}
              </th>
              <th className="px-3 py-3 text-left font-semibold text-neutral-900">
                {t('docColCreated')}
              </th>
              <th className="px-3 py-3 text-right font-semibold text-neutral-900">
                {t('docColTotal')}
              </th>
              <th className="px-3 py-3 text-center font-semibold text-neutral-900">
                {t('docColPrintCount')}
              </th>
              <th className="px-3 py-3 text-left font-semibold text-neutral-900">
                {t('docColStatus')}
              </th>
              <th className="px-3 py-3 text-left font-semibold text-neutral-900">
                {t('docColCreatedBy')}
              </th>
              <th className="relative py-3 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">{t('colActions')}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 bg-white">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-neutral-50 transition-colors">
                <td className="whitespace-nowrap py-3 pl-4 pr-3 font-medium sm:pl-6">
                  <Link
                    to={`/documents/${row.id}`}
                    className="text-brand-600 hover:text-brand-800 tabular-nums"
                  >
                    {row.documentNumber}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-neutral-700">
                  {row.typeLabel}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-neutral-900 max-w-[10rem] truncate">
                  {row.customerName}
                </td>
                <td className="whitespace-nowrap px-3 py-3 font-mono text-brand-800 tabular-nums">
                  {row.loanNumber}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-neutral-500 tabular-nums">
                  {formatDate(row.createdAt)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-medium tabular-nums">
                  {formatLKR(row.totalAmount)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-center tabular-nums text-neutral-600">
                  {row.printCount}
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  <span
                    className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                      row.printStatus === 'ORIGINAL'
                        ? 'bg-neutral-100 text-neutral-600'
                        : 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200'
                    }`}
                  >
                    {printStatusLabel(row.printStatus, language)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-neutral-600 max-w-[8rem] truncate">
                  {row.createdByName}
                </td>
                <td className="relative whitespace-nowrap py-3 pl-3 pr-4 sm:pr-6">
                  <DocumentRowActions
                    documentId={row.id}
                    printCount={row.printCount}
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-3 py-10 text-center text-neutral-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
