import type {
  FinanceTransaction,
  RecurringTransaction,
  TransactionType,
} from './types';
import { normalizeDescription } from './categorySuggestion';

const DAY_MS = 86_400_000;

export interface RecurringSuggestion {
  key: string;
  accountId: string;
  accountName: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  type: TransactionType;
  amountMinor: number;
  currency: string;
  note: string;
  frequency: 'weekly' | 'monthly';
  nextDueAt: string;
  matchCount: number;
  averageIntervalDays: number;
  amountVariationPercent: number;
}

interface CandidateGroup {
  identityNote: string;
  transactions: FinanceTransaction[];
}

function median(values: number[]): number {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]
    : Math.round((ordered[middle - 1] + ordered[middle]) / 2);
}

function daysBetween(first: string, second: string): number {
  return (
    (new Date(second).getTime() - new Date(first).getTime()) /
    DAY_MS
  );
}

function monthIndex(date: Date): number {
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
}

function isEndOfMonth(date: Date): boolean {
  const nextDay = new Date(date);
  nextDay.setUTCDate(date.getUTCDate() + 1);
  return nextDay.getUTCMonth() !== date.getUTCMonth();
}

function detectFrequency(
  transactions: FinanceTransaction[],
): { frequency: 'weekly' | 'monthly'; averageIntervalDays: number } | null {
  const dates = transactions.map((transaction) => new Date(transaction.occurredAt));
  const intervals = dates.slice(1).map((date, index) =>
    daysBetween(dates[index].toISOString(), date.toISOString()),
  );
  const averageIntervalDays =
    intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

  if (intervals.every((interval) => interval >= 5 && interval <= 9)) {
    return { frequency: 'weekly', averageIntervalDays };
  }

  const consecutiveMonths = dates.slice(1).every(
    (date, index) => monthIndex(date) - monthIndex(dates[index]) === 1,
  );
  const daysOfMonth = dates.map((date) => date.getUTCDate());
  const consistentDay =
    Math.max(...daysOfMonth) - Math.min(...daysOfMonth) <= 4 ||
    dates.every(isEndOfMonth);
  if (
    consecutiveMonths &&
    consistentDay &&
    intervals.every((interval) => interval >= 24 && interval <= 38)
  ) {
    return { frequency: 'monthly', averageIntervalDays };
  }

  return null;
}

function addMonthsClamped(date: Date, months: number): Date {
  const next = new Date(date);
  const originalDay = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
  ).getUTCDate();
  next.setUTCDate(Math.min(originalDay, lastDay));
  return next;
}

function nextFutureDate(
  lastOccurredAt: string,
  frequency: 'weekly' | 'monthly',
  now: Date,
): string {
  let next = new Date(lastOccurredAt);
  const preserveEndOfMonth = frequency === 'monthly' && isEndOfMonth(next);
  do {
    if (frequency === 'weekly') {
      next = new Date(next.getTime() + 7 * DAY_MS);
    } else {
      next = addMonthsClamped(next, 1);
      if (preserveEndOfMonth) {
        next.setUTCDate(
          new Date(
            Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
          ).getUTCDate(),
        );
      }
    }
  } while (next.getTime() <= now.getTime());
  return next.toISOString();
}

function isCoveredBySchedule(
  group: CandidateGroup,
  transaction: FinanceTransaction,
  recurring: RecurringTransaction[],
): boolean {
  return recurring.some((schedule) => {
    if (
      !schedule.active ||
      schedule.accountId !== transaction.accountId ||
      schedule.categoryId !== transaction.categoryId ||
      schedule.type !== transaction.type
    ) {
      return false;
    }
    const scheduleNote = normalizeDescription(schedule.note ?? '');
    return !group.identityNote || scheduleNote === group.identityNote;
  });
}

export function getRecurringSuggestions(
  transactions: FinanceTransaction[],
  recurring: RecurringTransaction[],
  now = new Date(),
): RecurringSuggestion[] {
  const groups = new Map<string, CandidateGroup>();

  for (const transaction of transactions) {
    if (
      transaction.type === 'transfer' ||
      transaction.amountMinor <= 0 ||
      new Date(transaction.occurredAt).getTime() > now.getTime()
    ) {
      continue;
    }
    const identityNote = normalizeDescription(transaction.note ?? '');
    const fallbackAmount = identityNote ? '' : `:${transaction.amountMinor}`;
    const key = [
      transaction.type,
      transaction.accountId,
      transaction.categoryId,
      identityNote || 'no-description',
    ].join(':') + fallbackAmount;
    const group = groups.get(key) ?? { identityNote, transactions: [] };
    group.transactions.push(transaction);
    groups.set(key, group);
  }

  const suggestions: RecurringSuggestion[] = [];
  for (const [key, group] of groups) {
    const ordered = [...group.transactions].sort(
      (a, b) =>
        new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
    );
    const minimumMatches = group.identityNote ? 3 : 4;
    if (ordered.length < minimumMatches) continue;

    const typicalAmount = median(ordered.map((transaction) => transaction.amountMinor));
    const maximumDeviation = Math.max(
      ...ordered.map((transaction) =>
        Math.abs(transaction.amountMinor - typicalAmount),
      ),
    );
    const amountVariationPercent = typicalAmount
      ? (maximumDeviation / typicalAmount) * 100
      : 100;
    if (amountVariationPercent > 15) continue;

    const pattern = detectFrequency(ordered);
    const latest = ordered[ordered.length - 1];
    if (
      !pattern ||
      latest.type === 'transfer' ||
      isCoveredBySchedule(group, latest, recurring)
    ) {
      continue;
    }

    suggestions.push({
      key,
      accountId: latest.accountId,
      accountName: latest.accountName,
      categoryId: latest.categoryId,
      categoryName: latest.categoryName,
      categoryIcon: latest.categoryIcon,
      type: latest.type,
      amountMinor: typicalAmount,
      currency: latest.currency,
      note: latest.note?.trim() || latest.categoryName,
      frequency: pattern.frequency,
      nextDueAt: nextFutureDate(latest.occurredAt, pattern.frequency, now),
      matchCount: ordered.length,
      averageIntervalDays: pattern.averageIntervalDays,
      amountVariationPercent,
    });
  }

  return suggestions.sort(
    (a, b) =>
      b.matchCount - a.matchCount ||
      new Date(a.nextDueAt).getTime() - new Date(b.nextDueAt).getTime(),
  );
}
