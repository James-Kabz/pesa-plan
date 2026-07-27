import { describe, expect, it } from 'vitest';
import type {
  ExpectedIncome,
  MonthlyBudget,
  RecurringTransaction,
  SavingsGoal,
} from './types';
import { buildLocalReminderPlan } from './localReminders';

const now = new Date(2026, 6, 20, 12);
const schedule = {
  id: 'internet',
  accountId: 'bank',
  accountName: 'Bank',
  categoryId: 'utilities',
  categoryName: 'Utilities',
  type: 'expense',
  amountMinor: 5_000,
  note: 'Internet',
  frequency: 'monthly',
  nextDueAt: new Date(2026, 6, 22, 10).toISOString(),
  active: true,
  accountCurrency: 'KES',
} as RecurringTransaction;
const income = {
  id: 'salary',
  name: 'Salary',
  amountMinor: 250_000,
  accountId: 'bank',
  accountName: 'Bank',
  payDay: 25,
  amountIsEstimate: false,
  active: true,
} as ExpectedIncome;
const budget = {
  id: 'food-2026-07',
  categoryId: 'food',
  categoryName: 'Food',
  categoryIcon: 'restaurant-outline',
  limitMinor: 20_000,
  spentMinor: 10_000,
  month: '2026-07',
} as MonthlyBudget;
const goal = {
  id: 'emergency',
  name: 'Emergency fund',
  targetMinor: 100_000,
  savedMinor: 20_000,
} as SavingsGoal;

function plan(
  overrides: Partial<Parameters<typeof buildLocalReminderPlan>[0]> = {},
) {
  return buildLocalReminderPlan({
    recurring: [schedule],
    expectedIncome: [income],
    budgets: [budget],
    savingsGoals: [goal],
    options: { schedules: true, paydays: true, weeklyReview: true },
    now,
    ...overrides,
  });
}

describe('local reminder planning', () => {
  it('plans schedule and payday reminders for the day before at 9am', () => {
    const reminders = plan();
    expect(reminders.find(({ kind }) => kind === 'schedule_due')).toMatchObject({
      title: 'Internet is coming up',
      scheduledFor: new Date(2026, 6, 21, 9).toISOString(),
      route: '/plan',
    });
    expect(reminders.find(({ kind }) => kind === 'payday')).toMatchObject({
      title: 'Salary is expected tomorrow',
      scheduledFor: new Date(2026, 6, 24, 9).toISOString(),
    });
  });

  it('combines budgets and incomplete goals into one Sunday check-in', () => {
    const weekly = plan().filter(({ kind }) => kind === 'weekly_review');
    expect(weekly.length).toBeGreaterThan(1);
    expect(weekly[0]).toMatchObject({
      scheduledFor: new Date(2026, 6, 26, 18).toISOString(),
    });
    expect(weekly.every(({ body }) => body.includes('budgets and savings goals'))).toBe(true);
  });

  it('uses a five-minute fallback when a due reminder time already passed', () => {
    const closeSchedule = {
      ...schedule,
      nextDueAt: new Date(2026, 6, 21, 10).toISOString(),
    };
    expect(
      plan({
        recurring: [closeSchedule],
        expectedIncome: [],
        budgets: [],
        savingsGoals: [],
      })[0].scheduledFor,
    ).toBe(new Date(now.getTime() + 5 * 60_000).toISOString());
  });

  it('honors per-type controls and ignores inactive, past, or completed items', () => {
    expect(
      plan({
        recurring: [{ ...schedule, active: false }],
        expectedIncome: [{ ...income, active: false }],
        savingsGoals: [{ ...goal, savedMinor: goal.targetMinor }],
        budgets: [],
      }),
    ).toHaveLength(0);
    expect(
      plan({
        options: { schedules: false, paydays: false, weeklyReview: true },
      }).every(({ kind }) => kind === 'weekly_review'),
    ).toBe(true);
  });

  it('keeps private amounts out of lock-screen notification copy', () => {
    for (const reminder of plan()) {
      expect(`${reminder.title} ${reminder.body}`).not.toMatch(
        /KES|Ksh|250000|5000/,
      );
    }
  });
});
