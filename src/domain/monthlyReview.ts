import type {
  Account,
  CategorySpend,
  Debt,
  DebtPayment,
  FinancialSnapshot,
  MonthlySummary,
  MonthlyTrend,
  SavingsGoal,
} from './types';

export interface MonthlyChange {
  amountMinor: number;
  percent: number | null;
}

export interface MonthlyReview {
  month: string;
  incomeMinor: number;
  expenseMinor: number;
  netMinor: number;
  savingsRate: number;
  savingsBalanceMinor: number;
  allocatedSavingsMinor: number;
  unallocatedSavingsMinor: number;
  savingsAllocationShortfallMinor: number;
  debtPaidMinor: number;
  debtBalanceMinor: number;
  accountBalanceMinor: number;
  netWorthMinor: number;
  incomeChange: MonthlyChange | null;
  expenseChange: MonthlyChange | null;
  netChange: MonthlyChange | null;
  debtBalanceChange: MonthlyChange | null;
  netWorthChange: MonthlyChange | null;
  topCategory: CategorySpend | null;
  topCategoryShare: number;
  hasPreviousCashFlow: boolean;
  hasPreviousSnapshot: boolean;
}

export interface MonthlyReviewInput {
  now: Date;
  currency: string;
  monthlySummary: MonthlySummary;
  monthlyTrends: MonthlyTrend[];
  categorySpending: CategorySpend[];
  accounts: Account[];
  savingsGoals: SavingsGoal[];
  debts: Debt[];
  debtPayments: DebtPayment[];
  financialSnapshots: FinancialSnapshot[];
}

export function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

export function previousMonthKey(date: Date): string {
  return monthKey(
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1)),
  );
}

function change(current: number, previous: number): MonthlyChange {
  return {
    amountMinor: current - previous,
    percent:
      previous === 0 ? null : ((current - previous) / Math.abs(previous)) * 100,
  };
}

function paymentIsInMonth(payment: DebtPayment, month: string): boolean {
  return payment.paidAt.slice(0, 7) === month;
}

export function buildMonthlyReview(input: MonthlyReviewInput): MonthlyReview {
  const currentMonth = monthKey(input.now);
  const previousMonth = previousMonthKey(input.now);
  const previousTrend =
    input.monthlyTrends.find((trend) => trend.month === previousMonth) ?? null;
  const currentSnapshot =
    input.financialSnapshots.find(
      (snapshot) =>
        snapshot.month === currentMonth &&
        snapshot.currency === input.currency,
    ) ?? null;
  const previousSnapshot =
    input.financialSnapshots.find(
      (snapshot) =>
        snapshot.month === previousMonth &&
        snapshot.currency === input.currency,
    ) ?? null;

  const currencyAccounts = input.accounts.filter(
    (account) => account.currency === input.currency,
  );
  const accountBalanceMinor = currencyAccounts.reduce(
    (sum, account) => sum + account.currentBalanceMinor,
    0,
  );
  const savingsAccounts = currencyAccounts.filter(
    (account) => account.type === 'savings',
  );
  const savingsAccountIds = new Set(
    savingsAccounts.map((account) => account.id),
  );
  const savingsBalanceMinor = savingsAccounts.reduce(
    (sum, account) => sum + Math.max(0, account.currentBalanceMinor),
    0,
  );
  const allocatedSavingsMinor = input.savingsGoals
    .filter((goal) => goal.accountId && savingsAccountIds.has(goal.accountId))
    .reduce((sum, goal) => sum + goal.savedMinor, 0);
  const debtPaidMinor = input.debtPayments
    .filter((payment) => paymentIsInMonth(payment, currentMonth))
    .reduce((sum, payment) => sum + payment.amountMinor, 0);
  const debtBalanceMinor = input.debts.reduce(
    (sum, debt) => sum + debt.balanceMinor,
    0,
  );
  const netWorthMinor =
    currentSnapshot?.netWorthMinor ??
    accountBalanceMinor - debtBalanceMinor;
  const topCategory = input.categorySpending[0] ?? null;

  return {
    month: currentMonth,
    incomeMinor: input.monthlySummary.incomeMinor,
    expenseMinor: input.monthlySummary.expenseMinor,
    netMinor: input.monthlySummary.netMinor,
    savingsRate: input.monthlySummary.savingsRate,
    savingsBalanceMinor,
    allocatedSavingsMinor,
    unallocatedSavingsMinor: Math.max(
      0,
      savingsBalanceMinor - allocatedSavingsMinor,
    ),
    savingsAllocationShortfallMinor: Math.max(
      0,
      allocatedSavingsMinor - savingsBalanceMinor,
    ),
    debtPaidMinor,
    debtBalanceMinor,
    accountBalanceMinor,
    netWorthMinor,
    incomeChange: previousTrend
      ? change(input.monthlySummary.incomeMinor, previousTrend.incomeMinor)
      : null,
    expenseChange: previousTrend
      ? change(input.monthlySummary.expenseMinor, previousTrend.expenseMinor)
      : null,
    netChange: previousTrend
      ? change(
          input.monthlySummary.netMinor,
          previousTrend.incomeMinor - previousTrend.expenseMinor,
        )
      : null,
    debtBalanceChange: previousSnapshot
      ? change(debtBalanceMinor, previousSnapshot.debtBalanceMinor)
      : null,
    netWorthChange: previousSnapshot
      ? change(netWorthMinor, previousSnapshot.netWorthMinor)
      : null,
    topCategory,
    topCategoryShare:
      topCategory && input.monthlySummary.expenseMinor > 0
        ? (topCategory.amountMinor / input.monthlySummary.expenseMinor) * 100
        : 0,
    hasPreviousCashFlow: previousTrend !== null,
    hasPreviousSnapshot: previousSnapshot !== null,
  };
}
