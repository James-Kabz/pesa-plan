import { describe, expect, it } from 'vitest';
import { currentMonthRange, parseMoneyInput, summarizeTransactions } from './money';

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
