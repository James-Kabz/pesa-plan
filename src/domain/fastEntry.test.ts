import { describe, expect, it } from 'vitest';
import type { Account, Category, FinanceTransaction } from './types';
import {
  getFastEntryDefaults,
  getRecentAmounts,
  getRecentTemplates,
  orderAccountsForEntry,
  orderCategoriesForEntry,
} from './fastEntry';

const accounts = [
  { id: 'cash', name: 'Cash' },
  { id: 'bank', name: 'Bank' },
] as Account[];
const categories = [
  { id: 'food', name: 'Food', type: 'expense' },
  { id: 'transport', name: 'Transport', type: 'expense' },
  { id: 'salary', name: 'Salary', type: 'income' },
] as Category[];
const transactions = [
  {
    id: 'latest',
    accountId: 'bank',
    categoryId: 'transport',
    type: 'expense',
    amountMinor: 2_000,
    note: 'Bus',
  },
  {
    id: 'duplicate',
    accountId: 'bank',
    categoryId: 'transport',
    type: 'expense',
    amountMinor: 2_000,
    note: 'Bus',
  },
  {
    id: 'older',
    accountId: 'cash',
    categoryId: 'food',
    type: 'expense',
    amountMinor: 1_500,
    note: 'Lunch',
  },
  {
    id: 'income',
    accountId: 'cash',
    categoryId: 'salary',
    type: 'income',
    amountMinor: 100_000,
    note: 'Salary',
  },
] as FinanceTransaction[];

describe('faster transaction entry', () => {
  it('uses the latest valid account and category for each transaction type', () => {
    expect(getFastEntryDefaults(transactions, accounts, categories, 'expense')).toEqual({
      accountId: 'bank',
      categoryId: 'transport',
    });
    expect(getFastEntryDefaults(transactions, accounts, categories, 'income')).toEqual({
      accountId: 'cash',
      categoryId: 'salary',
    });
  });

  it('falls back safely when old choices no longer exist', () => {
    expect(getFastEntryDefaults(transactions, [accounts[0]], [categories[0]], 'expense')).toEqual({
      accountId: 'cash',
      categoryId: 'food',
    });
  });

  it('deduplicates templates and recent amounts in recency order', () => {
    expect(getRecentTemplates(transactions, 'expense').map((item) => item.id)).toEqual([
      'latest',
      'older',
    ]);
    expect(getRecentAmounts(transactions, 'expense', 'bank')).toEqual([2_000]);
    expect(getRecentAmounts(transactions, 'expense', '')).toEqual([2_000, 1_500]);
  });

  it('shows recently used accounts and categories first', () => {
    expect(orderAccountsForEntry(accounts, transactions, 'expense').map((item) => item.id)).toEqual([
      'bank',
      'cash',
    ]);
    expect(
      orderCategoriesForEntry(categories, transactions, 'expense').map((item) => item.id),
    ).toEqual(['transport', 'food']);
  });
});
