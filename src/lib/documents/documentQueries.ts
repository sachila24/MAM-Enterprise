import type { DisplayMode } from '../i18n/simpleLabels';
import type { DbDocument, MamDemoDb } from '../local-db/types';
import { listDocuments } from '../local-db/repositories/documentsRepo';
import {
  type DocumentSortOrder,
  type DocumentTypeFilter,
  storageTypesForFilter,
} from './documentRegistryTypes';
import { enrichDocumentForList, type DocumentListRow } from './documentDisplay';

export interface DocumentQueryParams {
  search?: string;
  typeFilter?: DocumentTypeFilter;
  dateFrom?: string;
  dateTo?: string;
  sort?: DocumentSortOrder;
}

function matchesDateRange(
  createdAt: string,
  dateFrom?: string,
  dateTo?: string
): boolean {
  const day = createdAt.slice(0, 10);
  if (dateFrom && day < dateFrom) return false;
  if (dateTo && day > dateTo) return false;
  return true;
}

function sortDocuments(
  rows: DbDocument[],
  sort: DocumentSortOrder
): DbDocument[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    return sort === 'oldest' ? ta - tb : tb - ta;
  });
  return copy;
}

export function queryDocuments(
  db: MamDemoDb,
  params: DocumentQueryParams,
  displayMode: DisplayMode = 'both'
): DocumentListRow[] {
  const {
    search = '',
    typeFilter = 'all',
    dateFrom,
    dateTo,
    sort = 'newest',
  } = params;

  const storageTypes = storageTypesForFilter(typeFilter);
  const q = search.trim().toLowerCase();

  let rows = listDocuments(db);

  if (storageTypes) {
    rows = rows.filter((d) => storageTypes.includes(d.document_type));
  }

  rows = rows.filter((d) => matchesDateRange(d.created_at, dateFrom, dateTo));
  rows = sortDocuments(rows, sort);

  const enriched = rows.map((d) => enrichDocumentForList(d, db, displayMode));

  if (!q) return enriched;

  return enriched.filter((row) => row.searchText.includes(q));
}

export const DOCUMENTS_PAGE_SIZE = 25;

export function paginateDocuments<T>(
  items: T[],
  page: number,
  pageSize: number = DOCUMENTS_PAGE_SIZE
): { items: T[]; totalPages: number; page: number; total: number } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    totalPages,
    page: safePage,
    total,
  };
}
