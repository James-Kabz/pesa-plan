import type { FinanceTransaction, TransactionKind } from './types';

export type TransactionDateRange =
  | 'all'
  | 'this_month'
  | 'last_month'
  | 'last_30_days'
  | 'this_year';

export type TransactionSort = 'newest' | 'oldest' | 'highest';

export interface TransactionSearchFilters {
  query: string;
  type: 'all' | TransactionKind;
  accountId: string | null;
  accountName: string | null;
  categoryId: string | null;
  dateRange: TransactionDateRange;
  minAmountMinor: number | null;
  maxAmountMinor: number | null;
  sort: TransactionSort;
}

export const DEFAULT_TRANSACTION_FILTERS: TransactionSearchFilters = {
  query: '',
  type: 'all',
  accountId: null,
  accountName: null,
  categoryId: null,
  dateRange: 'all',
  minAmountMinor: null,
  maxAmountMinor: null,
  sort: 'newest',
};

function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function getDateBounds(
  range: TransactionDateRange,
  now: Date,
): { start: number; end: number } | null {
  if (range === 'all') return null;
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  if (range === 'this_month') {
    return {
      start: Date.UTC(year, month, 1),
      end: Date.UTC(year, month + 1, 1),
    };
  }
  if (range === 'last_month') {
    return {
      start: Date.UTC(year, month - 1, 1),
      end: Date.UTC(year, month, 1),
    };
  }
  if (range === 'this_year') {
    return {
      start: Date.UTC(year, 0, 1),
      end: Date.UTC(year + 1, 0, 1),
    };
  }
  const end = startOfUtcDay(now).getTime() + 86_400_000;
  return { start: end - 30 * 86_400_000, end };
}

export function parseOptionalSearchAmount(value: string): number | null {
  const normalized = value.replace(/,/g, '').trim();
  if (!normalized) return null;
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0
    ? Math.round(amount * 100)
    : null;
}

export function activeTransactionFilterCount(
  filters: TransactionSearchFilters,
): number {
  return [
    filters.type !== 'all',
    filters.accountId !== null,
    filters.categoryId !== null,
    filters.dateRange !== 'all',
    filters.minAmountMinor !== null || filters.maxAmountMinor !== null,
    filters.sort !== 'newest',
  ].filter(Boolean).length;
}

export function searchTransactions(
  transactions: FinanceTransaction[],
  filters: TransactionSearchFilters,
  now = new Date(),
): FinanceTransaction[] {
  const tokens = normalize(filters.query).split(' ').filter(Boolean);
  const bounds = getDateBounds(filters.dateRange, now);
  const accountName = normalize(filters.accountName ?? '');

  return transactions
    .filter((transaction) => {
      const occurredAt = new Date(transaction.occurredAt).getTime();
      const amountMajor = (transaction.amountMinor / 100).toFixed(2);
      const haystack = normalize(
        [
          transaction.note ?? '',
          transaction.categoryName,
          transaction.accountName,
          transaction.type,
          transaction.currency,
          amountMajor,
        ].join(' '),
      );
      const matchesQuery = tokens.every((token) => haystack.includes(token));
      const matchesType =
        filters.type === 'all' || transaction.type === filters.type;
      const matchesAccount =
        !filters.accountId ||
        transaction.accountId === filters.accountId ||
        (accountName.length > 0 &&
          normalize(transaction.accountName).includes(accountName));
      const matchesCategory =
        !filters.categoryId ||
        transaction.categoryId === filters.categoryId;
      const matchesDate =
        !bounds ||
        (occurredAt >= bounds.start && occurredAt < bounds.end);
      const matchesMinimum =
        filters.minAmountMinor === null ||
        transaction.amountMinor >= filters.minAmountMinor;
      const matchesMaximum =
        filters.maxAmountMinor === null ||
        transaction.amountMinor <= filters.maxAmountMinor;
      return (
        matchesQuery &&
        matchesType &&
        matchesAccount &&
        matchesCategory &&
        matchesDate &&
        matchesMinimum &&
        matchesMaximum
      );
    })
    .sort((a, b) => {
      if (filters.sort === 'highest') {
        return (
          b.amountMinor - a.amountMinor ||
          new Date(b.occurredAt).getTime() -
            new Date(a.occurredAt).getTime()
        );
      }
      const dateDifference =
        new Date(b.occurredAt).getTime() -
        new Date(a.occurredAt).getTime();
      return filters.sort === 'oldest' ? -dateDifference : dateDifference;
    });
}
