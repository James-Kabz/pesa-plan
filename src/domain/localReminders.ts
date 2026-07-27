import type {
  ExpectedIncome,
  MonthlyBudget,
  RecurringTransaction,
  SavingsGoal,
} from './types';

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
const REMINDER_HORIZON_DAYS = 45;

export type LocalReminderKind =
  | 'schedule_due'
  | 'payday'
  | 'weekly_review';

export interface LocalReminder {
  key: string;
  kind: LocalReminderKind;
  title: string;
  body: string;
  scheduledFor: string;
  route: '/plan' | '/';
}

export interface LocalReminderOptions {
  schedules: boolean;
  paydays: boolean;
  weeklyReview: boolean;
}

export interface LocalReminderInput {
  recurring: RecurringTransaction[];
  expectedIncome: ExpectedIncome[];
  budgets: MonthlyBudget[];
  savingsGoals: SavingsGoal[];
  options: LocalReminderOptions;
  now?: Date;
}

function reminderBefore(due: Date, now: Date): Date {
  const reminder = new Date(
    due.getFullYear(),
    due.getMonth(),
    due.getDate() - 1,
    9,
  );
  return reminder.getTime() <= now.getTime()
    ? new Date(now.getTime() + 5 * MINUTE_MS)
    : reminder;
}

function nextPayDate(payDay: number, now: Date): Date {
  function inMonth(year: number, month: number): Date {
    const lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(payDay, lastDay), 12);
  }

  let due = inMonth(now.getFullYear(), now.getMonth());
  if (due.getTime() <= now.getTime()) {
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    due = inMonth(nextMonth.getFullYear(), nextMonth.getMonth());
  }
  return due;
}

function nextWeeklyReview(now: Date): Date {
  const daysUntilSunday = (7 - now.getDay()) % 7;
  const review = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + daysUntilSunday,
    18,
  );
  if (review.getTime() <= now.getTime()) {
    review.setDate(review.getDate() + 7);
  }
  return review;
}

function datesWithinHorizon(
  first: Date,
  advance: (current: Date) => Date,
  now: Date,
): Date[] {
  const dates: Date[] = [];
  let current = first;
  while (withinHorizon(current, now)) {
    dates.push(current);
    current = advance(current);
  }
  return dates;
}

function withinHorizon(date: Date, now: Date): boolean {
  const difference = date.getTime() - now.getTime();
  return difference > 0 && difference <= REMINDER_HORIZON_DAYS * DAY_MS;
}

export function buildLocalReminderPlan({
  recurring,
  expectedIncome,
  budgets,
  savingsGoals,
  options,
  now = new Date(),
}: LocalReminderInput): LocalReminder[] {
  const reminders: LocalReminder[] = [];

  if (options.schedules) {
    for (const schedule of recurring) {
      const due = new Date(schedule.nextDueAt);
      if (!schedule.active || due.getTime() <= now.getTime()) continue;
      const scheduledFor = reminderBefore(due, now);
      if (!withinHorizon(scheduledFor, now)) continue;
      const name = schedule.note || schedule.categoryName;
      reminders.push({
        key: `schedule:${schedule.id}:${schedule.nextDueAt}`,
        kind: 'schedule_due',
        title: `${name} is coming up`,
        body: `Review this ${schedule.type} schedule before it is due. Nothing will be recorded automatically.`,
        scheduledFor: scheduledFor.toISOString(),
        route: '/plan',
      });
    }
  }

  if (options.paydays) {
    for (const income of expectedIncome) {
      if (!income.active) continue;
      const firstDue = nextPayDate(income.payDay, now);
      const dueDates = datesWithinHorizon(
        firstDue,
        (current) => {
          const nextMonth = new Date(
            current.getFullYear(),
            current.getMonth() + 1,
            1,
          );
          return nextPayDate(income.payDay, nextMonth);
        },
        now,
      );
      for (const due of dueDates) {
        const scheduledFor = reminderBefore(due, now);
        if (!withinHorizon(scheduledFor, now)) continue;
        reminders.push({
          key: `payday:${income.id}:${due.toISOString().slice(0, 10)}`,
          kind: 'payday',
          title: `${income.name} is expected ${
            due.toDateString() === now.toDateString() ? 'today' : 'tomorrow'
          }`,
          body: 'When it arrives, record the income so your monthly picture stays accurate.',
          scheduledFor: scheduledFor.toISOString(),
          route: '/',
        });
      }
    }
  }

  const hasActiveGoal = savingsGoals.some(
    (goal) => goal.savedMinor < goal.targetMinor,
  );
  if (options.weeklyReview && (budgets.length > 0 || hasActiveGoal)) {
    const subjects =
      budgets.length && hasActiveGoal
        ? 'budgets and savings goals'
        : budgets.length
          ? 'budgets'
          : 'savings goals';
    const reviews = datesWithinHorizon(
      nextWeeklyReview(now),
      (current) => {
        const next = new Date(current);
        next.setDate(next.getDate() + 7);
        return next;
      },
      now,
    );
    for (const review of reviews) {
      reminders.push({
        key: `weekly-review:${review.toISOString().slice(0, 10)}`,
        kind: 'weekly_review',
        title: 'Your weekly money check-in',
        body: `Take a minute to review your ${subjects} and decide what needs attention next.`,
        scheduledFor: review.toISOString(),
        route: '/',
      });
    }
  }

  return reminders
    .filter((reminder) => withinHorizon(new Date(reminder.scheduledFor), now))
    .sort(
      (a, b) =>
        new Date(a.scheduledFor).getTime() -
        new Date(b.scheduledFor).getTime(),
    )
    .slice(0, 24);
}
