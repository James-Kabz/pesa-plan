import type { Debt, FinanceTransaction, MonthlySummary, RecurringTransaction } from './types';

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

export function formatMoneyInput(value: string): string {
  const sanitized = value.replace(/,/g, '').replace(/[^\d.]/g, '');
  if (!sanitized) return '';

  const decimalIndex = sanitized.indexOf('.');
  const rawWhole =
    decimalIndex === -1 ? sanitized : sanitized.slice(0, decimalIndex);
  const rawDecimal =
    decimalIndex === -1
      ? ''
      : sanitized.slice(decimalIndex + 1).replace(/\./g, '').slice(0, 2);
  const whole = (rawWhole || '0').replace(/^0+(?=\d)/, '');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return decimalIndex === -1 ? grouped : `${grouped}.${rawDecimal}`;
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

export function getDueStatus(
  dueAt: string,
  now = new Date(),
): 'overdue' | 'due_soon' | 'upcoming' {
  const due = new Date(dueAt).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (due < today) return 'overdue';
  if (due - today <= 7 * 24 * 60 * 60 * 1000) return 'due_soon';
  return 'upcoming';
}

export function orderDebts(
  debts: Debt[],
  strategy: 'snowball' | 'avalanche',
): Debt[] {
  return [...debts].sort((a, b) =>
    strategy === 'snowball'
      ? a.balanceMinor - b.balanceMinor || b.aprBasisPoints - a.aprBasisPoints
      : b.aprBasisPoints - a.aprBasisPoints || a.balanceMinor - b.balanceMinor,
  );
}

export function emergencyFundMonths(
  emergencySavingsMinor: number,
  monthlyEssentialExpensesMinor: number,
): number {
  if (monthlyEssentialExpensesMinor <= 0) return 0;
  return emergencySavingsMinor / monthlyEssentialExpensesMinor;
}

export function estimatePayoffMonths(
  balanceMinor: number,
  aprBasisPoints: number,
  monthlyPaymentMinor: number,
): number | null {
  if (balanceMinor <= 0) return 0;
  if (monthlyPaymentMinor <= 0) return null;
  const monthlyRate = aprBasisPoints / 10_000 / 12;
  if (monthlyRate === 0) return Math.ceil(balanceMinor / monthlyPaymentMinor);
  if (monthlyPaymentMinor <= balanceMinor * monthlyRate) return null;
  const months =
    -Math.log(1 - (monthlyRate * balanceMinor) / monthlyPaymentMinor) /
    Math.log(1 + monthlyRate);
  return Math.ceil(months);
}

export function debtToIncomeRatio(
  monthlyDebtPaymentsMinor: number,
  monthlyIncomeMinor: number,
): number {
  return monthlyIncomeMinor <= 0 ? 0 : (monthlyDebtPaymentsMinor / monthlyIncomeMinor) * 100;
}

export function forecastRecurringNet(
  schedules: RecurringTransaction[],
  days = 30,
  now = new Date(),
  currency = 'KES',
): number {
  const limit = now.getTime() + days * 24 * 60 * 60 * 1000;
  return schedules
    .filter((item) => {
      const due = new Date(item.nextDueAt).getTime();
      return item.active && item.accountCurrency === currency && due >= now.getTime() && due <= limit;
    })
    .reduce(
      (total, item) => total + (item.type === 'income' ? item.amountMinor : -item.amountMinor),
      0,
    );
}
