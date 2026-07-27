import { describe, expect, it } from 'vitest';
import type {
  Account,
  ExpectedIncome,
  MonthlyBudget,
  MonthlySummary,
  RecurringTransaction,
  SavingsGoal,
} from './types';
import { buildTodayPriority, getBudgetPulse, getUpcomingSchedules } from './today';

const now = new Date(2026, 6, 20, 12);
const summary: MonthlySummary = {
  incomeMinor: 0,
  expenseMinor: 0,
  netMinor: 0,
  savingsRate: 0,
};
const account = {
  id: 'cash',
  name: 'Cash',
  type: 'cash',
  currency: 'KES',
  openingBalanceMinor: 0,
  currentBalanceMinor: 0,
  color: '#175C45',
  createdAt: '2026-07-01',
} as Account;

function input(overrides: Partial<Parameters<typeof buildTodayPriority>[0]> = {}) {
  return {
    now,
    currency: 'KES',
    accounts: [account],
    recurring: [] as RecurringTransaction[],
    budgets: [] as MonthlyBudget[],
    expectedIncome: [] as ExpectedIncome[],
    monthlySummary: summary,
    savingsGoals: [] as SavingsGoal[],
    ...overrides,
  };
}

describe('Today priority', () => {
  it('prioritizes overdue and due-soon schedules before planning guidance', () => {
    const schedules = [
      {
        id: 'soon',
        note: 'Internet',
        categoryName: 'Utilities',
        nextDueAt: new Date(2026, 6, 22).toISOString(),
        active: true,
        accountCurrency: 'KES',
        amountMinor: 5_000,
      },
      {
        id: 'overdue',
        note: 'Rent',
        categoryName: 'Housing',
        nextDueAt: new Date(2026, 6, 18).toISOString(),
        active: true,
        accountCurrency: 'KES',
        amountMinor: 30_000,
      },
    ] as RecurringTransaction[];
    expect(buildTodayPriority(input({ recurring: schedules }))).toMatchObject({
      kind: 'overdue',
      itemId: 'overdue',
      title: 'Rent is overdue',
    });
    expect(getUpcomingSchedules(schedules, 'KES', now).map((item) => item.id)).toEqual([
      'overdue',
      'soon',
    ]);
  });

  it('flags overspending before fast budget pacing', () => {
    const budgets = [
      {
        id: 'food-2026-07',
        categoryId: 'food',
        categoryName: 'Food',
        categoryIcon: 'restaurant-outline',
        limitMinor: 10_000,
        spentMinor: 12_000,
        month: '2026-07',
      },
      {
        id: 'transport-2026-07',
        categoryId: 'transport',
        categoryName: 'Transport',
        categoryIcon: 'car-outline',
        limitMinor: 20_000,
        spentMinor: 18_000,
        month: '2026-07',
      },
    ];
    expect(buildTodayPriority(input({ budgets }))).toMatchObject({
      kind: 'budget_over',
      itemId: 'food-2026-07',
      amountMinor: 2_000,
    });
    expect(getBudgetPulse(budgets, now).status).toBe('over');
  });

  it('identifies spending that is ahead of the month', () => {
    const budgets = [
      {
        id: 'food-2026-07',
        categoryId: 'food',
        categoryName: 'Food',
        categoryIcon: 'restaurant-outline',
        limitMinor: 100_000,
        spentMinor: 90_000,
        month: '2026-07',
      },
    ];
    expect(buildTodayPriority(input({ budgets }))).toMatchObject({
      kind: 'budget_pace',
      itemId: 'food-2026-07',
    });
    expect(getBudgetPulse(budgets, now).status).toBe('watch');
  });

  it('prompts for expected income only after the planned pay day', () => {
    const expectedIncome = [
      {
        id: 'income',
        name: 'Salary',
        amountMinor: 100_000,
        accountId: 'cash',
        accountName: 'Cash',
        payDay: 20,
        amountIsEstimate: false,
        active: true,
      },
      {
        id: 'later-income',
        name: 'Side work',
        amountMinor: 50_000,
        accountId: 'cash',
        accountName: 'Cash',
        payDay: 28,
        amountIsEstimate: true,
        active: true,
      },
    ];
    const budgets = [
      {
        id: 'food-2026-07',
        categoryId: 'food',
        categoryName: 'Food',
        categoryIcon: 'restaurant-outline',
        limitMinor: 100_000,
        spentMinor: 20_000,
        month: '2026-07',
      },
    ];
    expect(buildTodayPriority(input({ expectedIncome, budgets }))).toMatchObject({
      kind: 'income_expected',
      amountMinor: 100_000,
    });
    expect(
      buildTodayPriority(
        input({ now: new Date(2026, 6, 19), expectedIncome, budgets }),
      ).kind,
    ).toBe('all_clear');
  });

  it('guides setup and otherwise reports an all-clear day', () => {
    expect(buildTodayPriority(input()).kind).toBe('budget_setup');
    const budget = {
      id: 'food',
      categoryId: 'food',
      categoryName: 'Food',
      categoryIcon: 'restaurant-outline',
      limitMinor: 100_000,
      spentMinor: 20_000,
      month: '2026-07',
    };
    expect(buildTodayPriority(input({ budgets: [budget] })).kind).toBe('all_clear');
    expect(
      buildTodayPriority(
        input({
          accounts: [{ ...account, type: 'savings', currentBalanceMinor: 50_000 }],
          budgets: [budget],
        }),
      ).kind,
    ).toBe('savings_setup');
  });
});
