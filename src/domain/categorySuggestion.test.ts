import { describe, expect, it } from 'vitest';
import type { Category, FinanceTransaction } from './types';
import { normalizeDescription, suggestCategory } from './categorySuggestion';

const categories = [
  {
    id: 'groceries',
    name: 'Groceries',
    type: 'expense',
    icon: 'basket-outline',
    color: '#C56F36',
  },
  {
    id: 'dining',
    name: 'Dining out',
    type: 'expense',
    icon: 'restaurant-outline',
    color: '#B96334',
  },
  {
    id: 'salary',
    name: 'Salary',
    type: 'income',
    icon: 'briefcase-outline',
    color: '#2B7A5D',
  },
] as Category[];

function transaction(
  id: string,
  note: string,
  categoryId: string,
  type: 'income' | 'expense' = 'expense',
): FinanceTransaction {
  return {
    id,
    note,
    categoryId,
    type,
    accountId: 'cash',
    accountName: 'Cash',
    categoryName: categoryId,
    categoryIcon: 'basket-outline',
    amountMinor: 1_000,
    occurredAt: '2026-07-01',
    createdAt: '2026-07-01',
    currency: 'KES',
  };
}

describe('local category suggestions', () => {
  it('normalizes punctuation, spacing, and case', () => {
    expect(normalizeDescription("  Naivas—Westlands's  ")).toBe('naivas westlandss');
  });

  it('learns from an exact confirmed description', () => {
    const suggestion = suggestCategory(
      'NAIVAS',
      [transaction('1', 'Naivas', 'groceries')],
      categories,
      'expense',
    );
    expect(suggestion).toMatchObject({
      categoryId: 'groceries',
      reason: 'same_description',
      matchCount: 1,
    });
  });

  it('matches a similar description using meaningful shared words', () => {
    const suggestion = suggestCategory(
      'Naivas weekly shop',
      [
        transaction('1', 'Naivas groceries', 'groceries'),
        transaction('2', 'Naivas food shop', 'groceries'),
      ],
      categories,
      'expense',
    );
    expect(suggestion).toMatchObject({
      categoryId: 'groceries',
      reason: 'similar_description',
      matchCount: 2,
    });
  });

  it('does not guess when confirmed history is ambiguous', () => {
    expect(
      suggestCategory(
        'Java',
        [
          transaction('1', 'Java', 'groceries'),
          transaction('2', 'Java', 'dining'),
        ],
        categories,
        'expense',
      ),
    ).toBeNull();
  });

  it('ignores transfers, the wrong transaction type, and missing categories', () => {
    expect(
      suggestCategory(
        'Salary',
        [
          transaction('1', 'Salary', 'salary', 'income'),
          transaction('2', 'Salary', 'removed-category'),
        ],
        categories,
        'expense',
      ),
    ).toBeNull();
  });

  it('requires a useful description and a strong enough match', () => {
    expect(suggestCategory('', [], categories, 'expense')).toBeNull();
    expect(
      suggestCategory(
        'Completely unrelated',
        [transaction('1', 'Naivas groceries', 'groceries')],
        categories,
        'expense',
      ),
    ).toBeNull();
  });
});
