import { describe, expect, it } from 'vitest';
import type { FinanceTransaction, RecurringTransaction } from './types';
import { getRecurringSuggestions } from './recurringSuggestion';

function transaction(
  id: string,
  occurredAt: string,
  amountMinor = 1_000,
  note: string | null = 'Netflix',
): FinanceTransaction {
  return {
    id,
    accountId: 'bank',
    accountName: 'Bank',
    categoryId: 'subscriptions',
    categoryName: 'Subscriptions',
    categoryIcon: 'repeat-outline',
    type: 'expense',
    amountMinor,
    note,
    occurredAt,
    createdAt: occurredAt,
    currency: 'KES',
  };
}

const now = new Date('2026-07-20T12:00:00.000Z');

describe('recurring transaction suggestions', () => {
  it('detects a stable monthly pattern and advances the next due date into the future', () => {
    const suggestions = getRecurringSuggestions(
      [
        transaction('1', '2026-04-15T08:00:00.000Z', 1_000),
        transaction('2', '2026-05-15T08:00:00.000Z', 1_050),
        transaction('3', '2026-06-15T08:00:00.000Z', 1_000),
      ],
      [],
      now,
    );

    expect(suggestions[0]).toMatchObject({
      frequency: 'monthly',
      amountMinor: 1_000,
      matchCount: 3,
      note: 'Netflix',
      nextDueAt: '2026-08-15T08:00:00.000Z',
    });
  });

  it('detects a stable weekly pattern', () => {
    const suggestions = getRecurringSuggestions(
      [
        transaction('1', '2026-06-29T08:00:00.000Z'),
        transaction('2', '2026-07-06T08:00:00.000Z'),
        transaction('3', '2026-07-13T08:00:00.000Z'),
      ],
      [],
      now,
    );

    expect(suggestions[0]).toMatchObject({
      frequency: 'weekly',
      matchCount: 3,
      nextDueAt: '2026-07-27T08:00:00.000Z',
    });
  });

  it('keeps end-of-month patterns at the end of the next month', () => {
    const suggestions = getRecurringSuggestions(
      [
        transaction('1', '2026-01-31T08:00:00.000Z'),
        transaction('2', '2026-02-28T08:00:00.000Z'),
        transaction('3', '2026-03-31T08:00:00.000Z'),
      ],
      [],
      new Date('2026-04-15T12:00:00.000Z'),
    );

    expect(suggestions[0].nextDueAt).toBe('2026-04-30T08:00:00.000Z');
  });

  it('requires stronger evidence when descriptions are missing', () => {
    const three = [
      transaction('1', '2026-05-01T08:00:00.000Z', 1_000, null),
      transaction('2', '2026-06-01T08:00:00.000Z', 1_000, null),
      transaction('3', '2026-07-01T08:00:00.000Z', 1_000, null),
    ];
    expect(getRecurringSuggestions(three, [], now)).toHaveLength(0);
    expect(
      getRecurringSuggestions(
        [transaction('0', '2026-04-01T08:00:00.000Z', 1_000, null), ...three],
        [],
        now,
      ),
    ).toHaveLength(1);
  });

  it('rejects irregular dates and unstable amounts', () => {
    expect(
      getRecurringSuggestions(
        [
          transaction('1', '2026-04-01T08:00:00.000Z'),
          transaction('2', '2026-04-18T08:00:00.000Z'),
          transaction('3', '2026-06-01T08:00:00.000Z'),
        ],
        [],
        now,
      ),
    ).toHaveLength(0);
    expect(
      getRecurringSuggestions(
        [
          transaction('1', '2026-04-01T08:00:00.000Z', 1_000),
          transaction('2', '2026-05-01T08:00:00.000Z', 1_500),
          transaction('3', '2026-06-01T08:00:00.000Z', 1_000),
        ],
        [],
        now,
      ),
    ).toHaveLength(0);
  });

  it('does not suggest an item already covered by an active schedule', () => {
    const schedule = {
      id: 'schedule',
      accountId: 'bank',
      accountName: 'Bank',
      categoryId: 'subscriptions',
      categoryName: 'Subscriptions',
      type: 'expense',
      amountMinor: 1_000,
      note: 'Netflix',
      frequency: 'monthly',
      nextDueAt: '2026-08-15T08:00:00.000Z',
      active: true,
      accountCurrency: 'KES',
    } as RecurringTransaction;
    expect(
      getRecurringSuggestions(
        [
          transaction('1', '2026-04-15T08:00:00.000Z'),
          transaction('2', '2026-05-15T08:00:00.000Z'),
          transaction('3', '2026-06-15T08:00:00.000Z'),
        ],
        [schedule],
        now,
      ),
    ).toHaveLength(0);
  });

  it('ignores transfers and future transactions', () => {
    const transfer = { ...transaction('transfer', '2026-05-01T08:00:00.000Z'), type: 'transfer' } as FinanceTransaction;
    expect(
      getRecurringSuggestions(
        [
          transfer,
          transaction('1', '2026-05-01T08:00:00.000Z'),
          transaction('2', '2026-06-01T08:00:00.000Z'),
          transaction('3', '2026-08-01T08:00:00.000Z'),
        ],
        [],
        now,
      ),
    ).toHaveLength(0);
  });
});
