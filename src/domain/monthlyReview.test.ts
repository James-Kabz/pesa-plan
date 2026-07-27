import { describe, expect, it } from 'vitest';
import type {
  Account,
  Debt,
  DebtPayment,
  FinancialSnapshot,
  SavingsGoal,
} from './types';
import {
  buildMonthlyReview,
  monthKey,
  previousMonthKey,
} from './monthlyReview';

const now = new Date('2026-07-20T09:00:00.000Z');
const accounts: Account[] = [
  {
    id: 'bank',
    name: 'Bank',
    type: 'bank',
    currency: 'KES',
    openingBalanceMinor: 0,
    currentBalanceMinor: 80_000,
    color: '#175C45',
    createdAt: '2026-01-01',
  },
  {
    id: 'savings',
    name: 'Savings',
    type: 'savings',
    currency: 'KES',
    openingBalanceMinor: 0,
    currentBalanceMinor: 50_000,
    color: '#175C45',
    createdAt: '2026-01-01',
  },
  {
    id: 'usd',
    name: 'USD cash',
    type: 'cash',
    currency: 'USD',
    openingBalanceMinor: 0,
    currentBalanceMinor: 999_000,
    color: '#175C45',
    createdAt: '2026-01-01',
  },
];
const goals: SavingsGoal[] = [
  {
    id: 'emergency',
    name: 'Emergency fund',
    targetMinor: 100_000,
    savedMinor: 30_000,
    goalType: 'emergency',
    accountId: 'savings',
    accountName: 'Savings',
    accountBalanceMinor: 50_000,
    targetDate: null,
    color: '#175C45',
  },
];
const debts: Debt[] = [
  {
    id: 'loan',
    name: 'Loan',
    creditor: null,
    originalBalanceMinor: 100_000,
    balanceMinor: 70_000,
    aprBasisPoints: 1_200,
    minimumPaymentMinor: 5_000,
    dueDay: 25,
  },
];
const payments: DebtPayment[] = [
  {
    id: 'current',
    debtId: 'loan',
    amountMinor: 8_000,
    paidAt: '2026-07-10T09:00:00.000Z',
    note: null,
  },
  {
    id: 'old',
    debtId: 'loan',
    amountMinor: 4_000,
    paidAt: '2026-06-10T09:00:00.000Z',
    note: null,
  },
];
const snapshots: FinancialSnapshot[] = [
  {
    month: '2026-06',
    currency: 'KES',
    accountBalanceMinor: 100_000,
    debtBalanceMinor: 78_000,
    netWorthMinor: 22_000,
  },
  {
    month: '2026-07',
    currency: 'KES',
    accountBalanceMinor: 130_000,
    debtBalanceMinor: 70_000,
    netWorthMinor: 60_000,
  },
];

function review(overrides: Partial<Parameters<typeof buildMonthlyReview>[0]> = {}) {
  return buildMonthlyReview({
    now,
    currency: 'KES',
    monthlySummary: {
      incomeMinor: 100_000,
      expenseMinor: 60_000,
      netMinor: 40_000,
      savingsRate: 40,
    },
    monthlyTrends: [
      { month: '2026-07', incomeMinor: 100_000, expenseMinor: 60_000 },
      { month: '2026-06', incomeMinor: 90_000, expenseMinor: 70_000 },
    ],
    categorySpending: [
      {
        categoryId: 'food',
        categoryName: 'Food',
        categoryIcon: 'restaurant-outline',
        amountMinor: 24_000,
      },
    ],
    accounts,
    savingsGoals: goals,
    debts,
    debtPayments: payments,
    financialSnapshots: snapshots,
    ...overrides,
  });
}

describe('monthly review', () => {
  it('builds exact current and previous month keys', () => {
    expect(monthKey(now)).toBe('2026-07');
    expect(previousMonthKey(now)).toBe('2026-06');
    expect(previousMonthKey(new Date('2026-01-15T00:00:00.000Z'))).toBe(
      '2025-12',
    );
  });

  it('explains cash-flow changes from the previous month', () => {
    expect(review()).toMatchObject({
      incomeChange: { amountMinor: 10_000 },
      expenseChange: { amountMinor: -10_000 },
      netChange: { amountMinor: 20_000 },
      hasPreviousCashFlow: true,
    });
    expect(review().expenseChange?.percent).toBeCloseTo(-14.2857, 3);
  });

  it('separates real savings balances from goal allocations', () => {
    expect(review()).toMatchObject({
      savingsBalanceMinor: 50_000,
      allocatedSavingsMinor: 30_000,
      unallocatedSavingsMinor: 20_000,
      savingsAllocationShortfallMinor: 0,
    });
  });

  it('shows when goal allocations exceed real savings', () => {
    expect(
      review({
        savingsGoals: [{ ...goals[0], savedMinor: 70_000 }],
      }),
    ).toMatchObject({
      savingsBalanceMinor: 50_000,
      allocatedSavingsMinor: 70_000,
      unallocatedSavingsMinor: 0,
      savingsAllocationShortfallMinor: 20_000,
    });
  });

  it('uses only current-month debt payments and current active balances', () => {
    expect(review()).toMatchObject({
      debtPaidMinor: 8_000,
      debtBalanceMinor: 70_000,
      debtBalanceChange: { amountMinor: -8_000 },
    });
  });

  it('calculates net-worth change and ignores other currencies', () => {
    expect(review()).toMatchObject({
      accountBalanceMinor: 130_000,
      netWorthMinor: 60_000,
      netWorthChange: { amountMinor: 38_000 },
    });
  });

  it('identifies the largest spending category and its share', () => {
    expect(review()).toMatchObject({
      topCategory: { categoryName: 'Food', amountMinor: 24_000 },
      topCategoryShare: 40,
    });
  });

  it('returns honest no-history states without invented comparisons', () => {
    expect(
      review({ monthlyTrends: [], financialSnapshots: [] }),
    ).toMatchObject({
      incomeChange: null,
      expenseChange: null,
      netChange: null,
      debtBalanceChange: null,
      netWorthChange: null,
      hasPreviousCashFlow: false,
      hasPreviousSnapshot: false,
    });
  });
});
