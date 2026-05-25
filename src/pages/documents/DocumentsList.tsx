import { useMemo, useState } from 'react';
import { DocumentsFilterBar } from '../../components/documents/DocumentsFilterBar';
import { DocumentsTable } from '../../components/documents/DocumentsTable';
import { FilterToolbar } from '../../components/ui/FilterToolbar';
import { PageHeader } from '../../components/ui/PageHeader';
import type {
  DocumentSortOrder,
  DocumentTypeFilter,
} from '../../lib/documents/documentRegistryTypes';
import {
  DOCUMENTS_PAGE_SIZE,
  paginateDocuments,
  queryDocuments,
} from '../../lib/documents/documentQueries';
import { useDemoDb } from '../../lib/local-db/useDemoDb';
import { useT } from '../../i18n/I18nProvider';

export function DocumentsList() {
  const { t, language } = useT();
  const db = useDemoDb();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<DocumentTypeFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState<DocumentSortOrder>('newest');
  const [page, setPage] = useState(1);

  const allRows = useMemo(
    () =>
      queryDocuments(
        db,
        { search, typeFilter, dateFrom, dateTo, sort },
        language
      ),
    [db, search, typeFilter, dateFrom, dateTo, sort, language]
  );

  const { items, totalPages, page: safePage, total } = useMemo(
    () => paginateDocuments(allRows, page, DOCUMENTS_PAGE_SIZE),
    [allRows, page]
  );

  const resetPage = () => setPage(1);

  return (
    <div className="max-w-[90rem] mx-auto">
      <PageHeader
        title={t('nav.documents')}
        subtitle={t('documentsSubtitle')}
      />

      <FilterToolbar
        onSearchChange={(v) => {
          setSearch(v);
          resetPage();
        }}
        searchPlaceholder={t('docSearchPlaceholder')}
      />

      <DocumentsFilterBar
        typeFilter={typeFilter}
        onTypeFilterChange={(v) => {
          setTypeFilter(v);
          resetPage();
        }}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={(v) => {
          setDateFrom(v);
          resetPage();
        }}
        onDateToChange={(v) => {
          setDateTo(v);
          resetPage();
        }}
        sort={sort}
        onSortChange={(v) => {
          setSort(v);
          resetPage();
        }}
      />

      <div className="mb-3 flex items-center justify-between text-sm text-neutral-500">
        <span>
          {t('docRegistryCount')}: {total}
        </span>
        {totalPages > 1 && (
          <span>
            {t('docPageIndicator')} {safePage} / {totalPages}
          </span>
        )}
      </div>

      <DocumentsTable rows={items} emptyMessage={t('docNoDocumentsFound')} />

      {totalPages > 1 && (
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 disabled:opacity-40"
          >
            {t('docPaginationPrev')}
          </button>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 disabled:opacity-40"
          >
            {t('docPaginationNext')}
          </button>
        </div>
      )}
    </div>
  );
}
