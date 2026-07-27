import type {
  Account,
  Debt,
  DebtPayment,
  DebtStrategy,
  ExpectedIncome,
  MonthlyBudget,
  MonthlySummary,
  RecurringTransaction,
  SavingsGoal,
} from './types';
import { getDebtGuidance } from './debtGuidance';
import { getSavingsGuidance } from './savingsGuidance';

export type TodayAction =
  | 'review_recurring'
  | 'record_income'
  | 'review_budget'
  | 'create_budget'
  | 'create_goal'
  | 'review_savings'
  | 'review_debt'
  | 'add_transaction';

export interface TodayPriority {
  kind:
    | 'overdue'
    | 'due_soon'
    | 'budget_over'
    | 'budget_pace'
    | 'income_expected'
    | 'budget_setup'
    | 'savings_setup'
    | 'savings_unallocated'
    | 'savings_shortfall'
    | 'savings_funding'
    | 'debt_payment'
    | 'all_clear';
  tone: 'urgent' | 'warning' | 'positive' | 'neutral';
  title: string;
  reason: string;
  action: TodayAction;
  actionLabel: string;
  itemId?: string;
  amountMinor?: number;
}

export interface BudgetPulse {
  limitMinor: number;
  spentMinor: number;
  remainingMinor: number;
  safePerDayMinor: number;
  daysRemaining: number;
  spentRatio: number;
  monthProgress: number;
  status: 'none' | 'on_track' | 'watch' | 'over';
}

export interface BudgetPacing {
  remainingMinor: number;
  safePerDayMinor: number;
  projectedSpentMinor: number;
  daysRemaining: number;
  spentRatio: number;
  monthProgress: number;
  status: 'on_track' | 'watch' | 'used_up' | 'over';
}

export interface TodayInput {
  now: Date;
  currency: string;
  accounts: Account[];
  recurring: RecurringTransaction[];
  budgets: MonthlyBudget[];
  expectedIncome: ExpectedIncome[];
  monthlySummary: MonthlySummary;
  savingsGoals: SavingsGoal[];
  debts: Debt[];
  debtPayments: DebtPayment[];
  debtStrategy: DebtStrategy;
}

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function daysUntil(date: string, now: Date): number {
  return Math.round((startOfLocalDay(new Date(date)) - startOfLocalDay(now)) / 86_400_000);
}

export function getBudgetPulse(budgets: MonthlyBudget[], now = new Date()): BudgetPulse {
  const limitMinor = budgets.reduce((sum, budget) => sum + budget.limitMinor, 0);
  const spentMinor = budgets.reduce((sum, budget) => sum + budget.spentMinor, 0);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthProgress = Math.min(1, Math.max(0, now.getDate() / daysInMonth));
  const spentRatio = limitMinor > 0 ? spentMinor / limitMinor : 0;
  const remainingMinor = limitMinor - spentMinor;
  const pacing = budgets.map((budget) => getBudgetPacing(budget, now));
  const daysRemaining = Math.max(1, daysInMonth - now.getDate() + 1);
  const safePerDayMinor = Math.floor(
    pacing.reduce(
      (sum, item) => sum + Math.max(0, item.remainingMinor),
      0,
    ) / daysRemaining,
  );
  const hasOverBudgetCategory = pacing.some(({ status }) => status === 'over');
  const hasFastBudgetCategory = pacing.some(({ status }) => status === 'watch');
  const status =
    !limitMinor
      ? 'none'
      : spentRatio > 1 || hasOverBudgetCategory
        ? 'over'
        : spentRatio > monthProgress + 0.15 || hasFastBudgetCategory
          ? 'watch'
          : 'on_track';
  return {
    limitMinor,
    spentMinor,
    remainingMinor,
    safePerDayMinor,
    daysRemaining,
    spentRatio,
    monthProgress,
    status,
  };
}

export function getBudgetPacing(
  budget: Pick<MonthlyBudget, 'limitMinor' | 'spentMinor'>,
  now = new Date(),
): BudgetPacing {
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const elapsedDays = Math.min(daysInMonth, Math.max(1, now.getDate()));
  const daysRemaining = daysInMonth - elapsedDays + 1;
  const remainingMinor = budget.limitMinor - budget.spentMinor;
  const spentRatio =
    budget.limitMinor > 0 ? budget.spentMinor / budget.limitMinor : 0;
  const monthProgress = elapsedDays / daysInMonth;
  const safePerDayMinor = Math.floor(
    Math.max(0, remainingMinor) / daysRemaining,
  );
  const projectedSpentMinor = Math.round(
    (budget.spentMinor / elapsedDays) * daysInMonth,
  );
  const status =
    remainingMinor < 0
      ? 'over'
      : remainingMinor === 0
        ? 'used_up'
        : spentRatio > monthProgress + 0.15
          ? 'watch'
          : 'on_track';

  return {
    remainingMinor,
    safePerDayMinor,
    projectedSpentMinor,
    daysRemaining,
    spentRatio,
    monthProgress,
    status,
  };
}

export function getUpcomingSchedules(
  recurring: RecurringTransaction[],
  currency: string,
  now = new Date(),
  days = 7,
): RecurringTransaction[] {
  return recurring
    .filter((schedule) => {
      const dueIn = daysUntil(schedule.nextDueAt, now);
      return schedule.active && schedule.accountCurrency === currency && dueIn <= days;
    })
    .sort((a, b) => new Date(a.nextDueAt).getTime() - new Date(b.nextDueAt).getTime());
}

export function buildTodayPriority(input: TodayInput): TodayPriority {
  const upcoming = getUpcomingSchedules(input.recurring, input.currency, input.now);
  const overdue = upcoming.find((schedule) => daysUntil(schedule.nextDueAt, input.now) < 0);
  if (overdue) {
    return {
      kind: 'overdue',
      tone: 'urgent',
      title: `${overdue.note || overdue.categoryName} is overdue`,
      reason: 'This scheduled item has passed its due date and has not been recorded.',
      action: 'review_recurring',
      actionLabel: 'Review schedule',
      itemId: overdue.id,
      amountMinor: overdue.amountMinor,
    };
  }

  const dueSoon = upcoming[0];
  if (dueSoon) {
    const dueIn = daysUntil(dueSoon.nextDueAt, input.now);
    return {
      kind: 'due_soon',
      tone: 'warning',
      title: `${dueSoon.note || dueSoon.categoryName} is ${dueIn === 0 ? 'due today' : `due in ${dueIn} days`}`,
      reason: 'Review it now so your upcoming cash flow stays accurate.',
      action: 'review_recurring',
      actionLabel: 'Review schedule',
      itemId: dueSoon.id,
      amountMinor: dueSoon.amountMinor,
    };
  }

  const overBudget = [...input.budgets]
    .filter((budget) => budget.spentMinor > budget.limitMinor)
    .sort(
      (a, b) =>
        b.spentMinor - b.limitMinor - (a.spentMinor - a.limitMinor),
    )[0];
  if (overBudget) {
    return {
      kind: 'budget_over',
      tone: 'urgent',
      title: `${overBudget.categoryName} is over budget`,
      reason: 'Recorded spending has passed the limit you set for this month.',
      action: 'review_budget',
      actionLabel: 'Review budget',
      itemId: overBudget.id,
      amountMinor: overBudget.spentMinor - overBudget.limitMinor,
    };
  }

  const monthProgress = getBudgetPulse(input.budgets, input.now).monthProgress;
  const fastBudget = [...input.budgets]
    .filter(
      (budget) =>
        budget.spentMinor <= budget.limitMinor &&
        budget.spentMinor / budget.limitMinor > monthProgress + 0.15,
    )
    .sort(
      (a, b) =>
        b.spentMinor / b.limitMinor - a.spentMinor / a.limitMinor,
    )[0];
  if (fastBudget) {
    return {
      kind: 'budget_pace',
      tone: 'warning',
      title: `${fastBudget.categoryName} is moving quickly`,
      reason: 'You have used a larger share of this budget than the share of the month completed.',
      action: 'review_budget',
      actionLabel: 'See budget',
      itemId: fastBudget.id,
      amountMinor: fastBudget.limitMinor - fastBudget.spentMinor,
    };
  }

  const accountIds = new Set(
    input.accounts
      .filter((account) => account.currency === input.currency)
      .map((account) => account.id),
  );
  const expectedForCurrency = input.expectedIncome.filter((income) =>
    accountIds.has(income.accountId),
  );
  const dueExpectedMinor = expectedForCurrency.reduce((sum, income) => {
    const finalDay = new Date(
      input.now.getFullYear(),
      input.now.getMonth() + 1,
      0,
    ).getDate();
    return input.now.getDate() >= Math.min(income.payDay, finalDay)
      ? sum + income.amountMinor
      : sum;
  }, 0);
  if (dueExpectedMinor > 0 && input.monthlySummary.incomeMinor < dueExpectedMinor) {
    return {
      kind: 'income_expected',
      tone: 'neutral',
      title: 'Expected income is not fully recorded',
      reason: 'Your planned pay day has arrived, but recorded income is still below your monthly plan.',
      action: 'record_income',
      actionLabel: 'Record income',
      amountMinor: dueExpectedMinor - input.monthlySummary.incomeMinor,
    };
  }

  if (!input.budgets.length) {
    return {
      kind: 'budget_setup',
      tone: 'neutral',
      title: 'Give this month a simple spending plan',
      reason: 'A few category limits will make your daily guidance more useful.',
      action: 'create_budget',
      actionLabel: 'Create a budget',
    };
  }

  const hasSavingsIntent =
    input.accounts.some(
      (account) =>
        account.type === 'savings' &&
        account.currency === input.currency,
    ) || input.savingsGoals.length > 0;
  const savingsGuidance = getSavingsGuidance(
    input.accounts,
    input.savingsGoals,
    input.currency,
  );
  if (
    hasSavingsIntent &&
    savingsGuidance.action === 'restore_balance'
  ) {
    return {
      kind: 'savings_shortfall',
      tone: 'warning',
      title: savingsGuidance.title,
      reason: savingsGuidance.reason,
      action: 'review_savings',
      actionLabel: 'Review savings',
      amountMinor: savingsGuidance.suggestedAmountMinor,
    };
  }
  if (
    savingsGuidance.action === 'allocate_goal' ||
    savingsGuidance.action === 'create_goal'
  ) {
    return {
      kind:
        savingsGuidance.action === 'allocate_goal'
          ? 'savings_unallocated'
          : 'savings_setup',
      tone: 'positive',
      title: savingsGuidance.title,
      reason: savingsGuidance.reason,
      action:
        savingsGuidance.action === 'create_goal'
          ? 'create_goal'
          : 'review_savings',
      actionLabel:
        savingsGuidance.action === 'create_goal'
          ? 'Create a goal'
          : 'Allocate savings',
      itemId: savingsGuidance.goalId,
      amountMinor: savingsGuidance.suggestedAmountMinor,
    };
  }
  if (
    hasSavingsIntent &&
    (savingsGuidance.action === 'link_goal' ||
      savingsGuidance.action === 'fund_goal' ||
      savingsGuidance.action === 'create_account')
  ) {
    return {
      kind:
        savingsGuidance.action === 'fund_goal'
          ? 'savings_funding'
          : 'savings_setup',
      tone: 'neutral',
      title: savingsGuidance.title,
      reason: savingsGuidance.reason,
      action: 'review_savings',
      actionLabel: 'Review savings',
      itemId: savingsGuidance.goalId,
    };
  }

  const debtGuidance = getDebtGuidance(
    input.debts,
    input.debtPayments,
    input.debtStrategy,
    input.monthlySummary.netMinor,
    input.now,
  );
  if (
    debtGuidance.action === 'raise_minimum' ||
    debtGuidance.action === 'pay_minimum' ||
    debtGuidance.action === 'pay_extra'
  ) {
    return {
      kind: 'debt_payment',
      tone:
        debtGuidance.action === 'raise_minimum' ? 'warning' : 'neutral',
      title: debtGuidance.title,
      reason: debtGuidance.reason,
      action: 'review_debt',
      actionLabel:
        debtGuidance.action === 'pay_extra'
          ? 'Make extra payment'
          : 'Review payment',
      itemId: debtGuidance.debtId,
      amountMinor: debtGuidance.suggestedAmountMinor,
    };
  }

  return {
    kind: 'all_clear',
    tone: 'positive',
    title: 'You are up to date',
    reason: 'No overdue schedules or urgent budget issues need attention today.',
    action: 'add_transaction',
    actionLabel: 'Add transaction',
  };
}
