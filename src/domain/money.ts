import type { FinanceTransaction, MonthlySummary } from './types';

export function formatMoney(
  amountMinor: number,
  currency = 'KES',
  locale = 'en-KE',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export function parseMoneyInput(value: string): number | null {
  const normalized = value.replace(/,/g, '').trim();
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100);
}

export function summarizeTransactions(
  transactions: Pick<FinanceTransaction, 'type' | 'amountMinor'>[],
): MonthlySummary {
  const incomeMinor = transactions
    .filter((item) => item.type === 'income')
    .reduce((total, item) => total + item.amountMinor, 0);
  const expenseMinor = transactions
    .filter((item) => item.type === 'expense')
    .reduce((total, item) => total + item.amountMinor, 0);
  const netMinor = incomeMinor - expenseMinor;
  const savingsRate =
    incomeMinor === 0 ? 0 : Math.max(-100, Math.min(100, (netMinor / incomeMinor) * 100));

  return { incomeMinor, expenseMinor, netMinor, savingsRate };
}

export function currentMonthRange(now = new Date()): { start: string; end: string } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start: start.toISOString(), end: end.toISOString() };
}
