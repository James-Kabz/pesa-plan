import { describe, expect, it } from 'vitest';
import type {
  Account,
  ExpectedIncome,
  MonthlyBudget,
  MonthlySummary,
  RecurringTransaction,
  SavingsGoal,
  Debt,
  DebtPayment,
} from './types';
import {
  buildTodayPriority,
  getBudgetGuidance,
  getBudgetPulse,
  getUpcomingSchedules,
} from './today';

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
    debts: [] as Debt[],
    debtPayments: [] as DebtPayment[],
    debtStrategy: 'avalanche' as const,
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

  it('flags overspending before low-room budget guidance', () => {
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
    expect(getBudgetPulse(budgets).status).toBe('over');
  });

  it('identifies a category with little spending room left', () => {
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
      kind: 'budget_low',
      itemId: 'food-2026-07',
      reason: 'Only 10% of this monthly budget remains.',
    });
    expect(getBudgetPulse(budgets).status).toBe('watch');
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

  it('surfaces unallocated savings and real-balance shortfalls', () => {
    const budget = {
      id: 'food',
      categoryId: 'food',
      categoryName: 'Food',
      categoryIcon: 'restaurant-outline',
      limitMinor: 100_000,
      spentMinor: 20_000,
      month: '2026-07',
    };
    const savingsAccount = {
      ...account,
      id: 'savings',
      name: 'Savings',
      type: 'savings',
      currentBalanceMinor: 100_000,
    } as Account;
    const goal = {
      id: 'emergency',
      name: 'Emergency fund',
      targetMinor: 200_000,
      savedMinor: 40_000,
      goalType: 'emergency',
      accountId: 'savings',
      accountName: 'Savings',
      accountBalanceMinor: 100_000,
      targetDate: null,
      color: '#175C45',
    } as SavingsGoal;

    expect(
      buildTodayPriority(
        input({
          accounts: [account, savingsAccount],
          budgets: [budget],
          savingsGoals: [goal],
        }),
      ),
    ).toMatchObject({
      kind: 'savings_unallocated',
      itemId: 'emergency',
      amountMinor: 60_000,
    });
    expect(
      buildTodayPriority(
        input({
          accounts: [
            account,
            { ...savingsAccount, currentBalanceMinor: 30_000 },
          ],
          budgets: [budget],
          savingsGoals: [goal],
        }),
      ),
    ).toMatchObject({
      kind: 'savings_shortfall',
      amountMinor: 10_000,
    });
  });

  it('surfaces the next debt payment after higher-priority planning issues', () => {
    const budget = {
      id: 'food',
      categoryId: 'food',
      categoryName: 'Food',
      categoryIcon: 'restaurant-outline',
      limitMinor: 100_000,
      spentMinor: 20_000,
      month: '2026-07',
    };
    const debt = {
      id: 'loan',
      name: 'Small loan',
      creditor: null,
      originalBalanceMinor: 50_000,
      balanceMinor: 30_000,
      aprBasisPoints: 1_200,
      minimumPaymentMinor: 3_000,
      dueDay: 25,
    } as Debt;
    expect(
      buildTodayPriority(
        input({
          budgets: [budget],
          debts: [debt],
          monthlySummary: { ...summary, incomeMinor: 10_000, netMinor: 10_000 },
        }),
      ),
    ).toMatchObject({
      kind: 'debt_payment',
      action: 'review_debt',
      itemId: 'loan',
      amountMinor: 3_000,
    });
  });
});

describe('Budget Compass', () => {
  const budget = {
    limitMinor: 100_000,
    spentMinor: 30_000,
  };

  it('uses real transaction sizes instead of a calendar-day allowance', () => {
    expect(getBudgetGuidance(budget, [10_000, 15_000, 20_000])).toMatchObject({
      remainingMinor: 70_000,
      remainingRatio: 0.7,
      spendCount: 3,
      typicalSpendMinor: 15_000,
      similarSpendsLeft: 4,
      status: 'comfortable',
    });
  });

  it('identifies tight, fully used, and over-budget categories', () => {
    expect(
      getBudgetGuidance(
        { ...budget, spentMinor: 90_000 },
        [20_000, 25_000],
      ),
    ).toMatchObject({
      typicalSpendMinor: 22_500,
      similarSpendsLeft: 0,
      status: 'tight',
    });
    expect(
      getBudgetGuidance({ ...budget, spentMinor: 100_000 }, [50_000, 50_000]),
    ).toMatchObject({
      similarSpendsLeft: 0,
      status: 'used_up',
    });
    expect(
      getBudgetGuidance({ ...budget, spentMinor: 110_000 }, [55_000, 55_000]),
    ).toMatchObject({
      remainingMinor: -10_000,
      similarSpendsLeft: 0,
      status: 'over',
    });
  });

  it('keeps an untouched category ready for a lump purchase', () => {
    expect(getBudgetGuidance({ ...budget, spentMinor: 0 })).toMatchObject({
      remainingMinor: 100_000,
      remainingRatio: 1,
      spendCount: 0,
      typicalSpendMinor: null,
      similarSpendsLeft: null,
      status: 'untouched',
    });
  });

  it('summarizes available room and categories needing attention', () => {
    const pulse = getBudgetPulse(
      [
        { ...budget, limitMinor: 100_000, spentMinor: 40_000 },
        { ...budget, limitMinor: 50_000, spentMinor: 60_000 },
      ] as MonthlyBudget[],
    );
    expect(pulse).toMatchObject({
      remainingMinor: 50_000,
      availableMinor: 60_000,
      overageMinor: 10_000,
      attentionCount: 1,
      status: 'over',
    });
  });
});
