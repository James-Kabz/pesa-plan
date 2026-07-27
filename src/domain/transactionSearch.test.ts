import { describe, expect, it } from 'vitest';
import type { FinanceTransaction } from './types';
import {
  activeTransactionFilterCount,
  DEFAULT_TRANSACTION_FILTERS,
  parseOptionalSearchAmount,
  searchTransactions,
  type TransactionSearchFilters,
} from './transactionSearch';

const now = new Date('2026-07-27T12:00:00.000Z');
const transactions: FinanceTransaction[] = [
  {
    id: 'rent',
    accountId: 'bank',
    accountName: 'Main Bank',
    categoryId: 'housing',
    categoryName: 'Housing',
    categoryIcon: 'home-outline',
    type: 'expense',
    amountMinor: 30_000,
    note: 'July Rent',
    occurredAt: '2026-07-02T09:00:00.000Z',
    createdAt: '2026-07-02T09:00:00.000Z',
    currency: 'KES',
  },
  {
    id: 'salary',
    accountId: 'bank',
    accountName: 'Main Bank',
    categoryId: 'salary',
    categoryName: 'Salary',
    categoryIcon: 'cash-outline',
    type: 'income',
    amountMinor: 100_000,
    note: 'Acme salary',
    occurredAt: '2026-06-28T09:00:00.000Z',
    createdAt: '2026-06-28T09:00:00.000Z',
    currency: 'KES',
  },
  {
    id: 'transfer',
    accountId: 'bank',
    accountName: 'Main Bank → Emergency Savings',
    categoryId: 'transfer',
    categoryName: 'Transfer',
    categoryIcon: 'swap-horizontal-outline',
    type: 'transfer',
    amountMinor: 20_000,
    note: null,
    occurredAt: '2026-07-25T09:00:00.000Z',
    createdAt: '2026-07-25T09:00:00.000Z',
    currency: 'KES',
  },
  {
    id: 'old-food',
    accountId: 'cash',
    accountName: 'Cash',
    categoryId: 'food',
    categoryName: 'Food',
    categoryIcon: 'restaurant-outline',
    type: 'expense',
    amountMinor: 5_000,
    note: 'Café lunch',
    occurredAt: '2025-12-15T09:00:00.000Z',
    createdAt: '2025-12-15T09:00:00.000Z',
    currency: 'KES',
  },
];

function filters(
  overrides: Partial<TransactionSearchFilters> = {},
): TransactionSearchFilters {
  return { ...DEFAULT_TRANSACTION_FILTERS, ...overrides };
}

describe('global transaction search', () => {
  it('matches every normalized query token across useful fields', () => {
    expect(
      searchTransactions(transactions, filters({ query: 'rent main' }), now)
        .map((item) => item.id),
    ).toEqual(['rent']);
    expect(
      searchTransactions(transactions, filters({ query: 'cafe food' }), now)
        .map((item) => item.id),
    ).toEqual(['old-food']);
    expect(
      searchTransactions(transactions, filters({ query: '1000.00' }), now)
        .map((item) => item.id),
    ).toEqual(['salary']);
  });

  it('filters by type, category, and either side of a transfer account name', () => {
    expect(
      searchTransactions(
        transactions,
        filters({ type: 'expense', categoryId: 'housing' }),
        now,
      ).map((item) => item.id),
    ).toEqual(['rent']);
    expect(
      searchTransactions(
        transactions,
        filters({
          accountId: 'savings',
          accountName: 'Emergency Savings',
        }),
        now,
      ).map((item) => item.id),
    ).toEqual(['transfer']);
  });

  it('supports current, previous, rolling-30-day, and yearly ranges', () => {
    expect(
      searchTransactions(
        transactions,
        filters({ dateRange: 'this_month' }),
        now,
      ).map((item) => item.id),
    ).toEqual(['transfer', 'rent']);
    expect(
      searchTransactions(
        transactions,
        filters({ dateRange: 'last_month' }),
        now,
      ).map((item) => item.id),
    ).toEqual(['salary']);
    expect(
      searchTransactions(
        transactions,
        filters({ dateRange: 'last_30_days' }),
        now,
      ).map((item) => item.id),
    ).toEqual(['transfer', 'rent', 'salary']);
    expect(
      searchTransactions(
        transactions,
        filters({ dateRange: 'this_year' }),
        now,
      ).map((item) => item.id),
    ).toEqual(['transfer', 'rent', 'salary']);
  });

  it('filters inclusive amount bounds and sorts deterministically', () => {
    expect(
      searchTransactions(
        transactions,
        filters({ minAmountMinor: 20_000, maxAmountMinor: 30_000 }),
        now,
      ).map((item) => item.id),
    ).toEqual(['transfer', 'rent']);
    expect(
      searchTransactions(
        transactions,
        filters({ sort: 'highest' }),
        now,
      ).map((item) => item.id),
    ).toEqual(['salary', 'rent', 'transfer', 'old-food']);
    expect(
      searchTransactions(
        transactions,
        filters({ sort: 'oldest' }),
        now,
      ).map((item) => item.id),
    ).toEqual(['old-food', 'salary', 'rent', 'transfer']);
  });

  it('parses optional money bounds safely', () => {
    expect(parseOptionalSearchAmount('1,234.56')).toBe(123_456);
    expect(parseOptionalSearchAmount('0')).toBe(0);
    expect(parseOptionalSearchAmount('')).toBeNull();
    expect(parseOptionalSearchAmount('12.345')).toBeNull();
    expect(parseOptionalSearchAmount('-2')).toBeNull();
  });

  it('counts filter groups without treating text search as a filter badge', () => {
    expect(
      activeTransactionFilterCount(
        filters({
          query: 'rent',
          type: 'expense',
          accountId: 'bank',
          accountName: 'Main Bank',
          minAmountMinor: 1,
          maxAmountMinor: 2,
          sort: 'highest',
        }),
      ),
    ).toBe(4);
  });
});
