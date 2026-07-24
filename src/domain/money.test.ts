import { describe, expect, it } from 'vitest';
import {
  currentMonthRange,
  emergencyFundMonths,
  estimatePayoffMonths,
  getDueStatus,
  orderDebts,
  parseMoneyInput,
  summarizeTransactions,
} from './money';

describe('parseMoneyInput', () => {
  it('converts decimal input into integer minor units', () => {
    expect(parseMoneyInput('1,234.56')).toBe(123456);
    expect(parseMoneyInput('100')).toBe(10000);
    expect(parseMoneyInput('0.01')).toBe(1);
  });

  it('rejects invalid, zero, negative, and over-precise amounts', () => {
    expect(parseMoneyInput('')).toBeNull();
    expect(parseMoneyInput('0')).toBeNull();
    expect(parseMoneyInput('-20')).toBeNull();
    expect(parseMoneyInput('12.345')).toBeNull();
    expect(parseMoneyInput('money')).toBeNull();
  });
});

describe('summarizeTransactions', () => {
  it('calculates income, expenses, net cash flow, and savings rate', () => {
    expect(
      summarizeTransactions([
        { type: 'income', amountMinor: 100_000 },
        { type: 'income', amountMinor: 25_000 },
        { type: 'expense', amountMinor: 50_000 },
      ]),
    ).toEqual({
      incomeMinor: 125_000,
      expenseMinor: 50_000,
      netMinor: 75_000,
      savingsRate: 60,
    });
  });

  it('returns a zero savings rate when there is no income', () => {
    expect(summarizeTransactions([{ type: 'expense', amountMinor: 5_000 }])).toEqual({
      incomeMinor: 0,
      expenseMinor: 5_000,
      netMinor: -5_000,
      savingsRate: 0,
    });
  });

  it('does not count transfers as income or spending', () => {
    expect(
      summarizeTransactions([
        { type: 'income', amountMinor: 100_000 },
        { type: 'expense', amountMinor: 20_000 },
        { type: 'transfer', amountMinor: 50_000 },
      ]),
    ).toEqual({
      incomeMinor: 100_000,
      expenseMinor: 20_000,
      netMinor: 80_000,
      savingsRate: 80,
    });
  });
});

describe('currentMonthRange', () => {
  it('returns inclusive start and exclusive next-month boundaries', () => {
    const result = currentMonthRange(new Date(2026, 6, 24, 12));
    const start = new Date(result.start);
    const end = new Date(result.end);

    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(6);
    expect(start.getDate()).toBe(1);
    expect(end.getMonth()).toBe(7);
    expect(end.getDate()).toBe(1);
  });
});

describe('getDueStatus', () => {
  const now = new Date(2026, 6, 24, 12);

  it('classifies overdue, due-soon, and upcoming dates', () => {
    expect(getDueStatus(new Date(2026, 6, 23).toISOString(), now)).toBe('overdue');
    expect(getDueStatus(new Date(2026, 6, 29).toISOString(), now)).toBe('due_soon');
    expect(getDueStatus(new Date(2026, 7, 10).toISOString(), now)).toBe('upcoming');
  });
});

describe('debt and emergency calculations', () => {
  const debts = [
    { id: 'large', balanceMinor: 500_000, aprBasisPoints: 2400 },
    { id: 'small', balanceMinor: 100_000, aprBasisPoints: 1200 },
    { id: 'high-apr', balanceMinor: 300_000, aprBasisPoints: 3000 },
  ] as import('./types').Debt[];

  it('orders debts by snowball and avalanche priorities', () => {
    expect(orderDebts(debts, 'snowball').map((debt) => debt.id)).toEqual([
      'small',
      'high-apr',
      'large',
    ]);
    expect(orderDebts(debts, 'avalanche').map((debt) => debt.id)).toEqual([
      'high-apr',
      'large',
      'small',
    ]);
  });

  it('calculates emergency coverage in months', () => {
    expect(emergencyFundMonths(300_000, 100_000)).toBe(3);
    expect(emergencyFundMonths(300_000, 0)).toBe(0);
  });

  it('estimates payoff months and detects negative amortization', () => {
    expect(estimatePayoffMonths(120_000, 0, 10_000)).toBe(12);
    expect(estimatePayoffMonths(100_000, 2400, 1_000)).toBeNull();
    expect(estimatePayoffMonths(0, 2400, 1_000)).toBe(0);
  });
});
