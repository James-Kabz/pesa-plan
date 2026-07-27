import { describe, expect, it } from 'vitest';
import type { Debt, DebtPayment } from './types';
import { getDebtGuidance } from './debtGuidance';

const now = new Date(2026, 6, 20, 12);
const debts: Debt[] = [
  {
    id: 'card',
    name: 'Credit card',
    creditor: 'Bank',
    originalBalanceMinor: 100_000,
    balanceMinor: 80_000,
    aprBasisPoints: 2_400,
    minimumPaymentMinor: 5_000,
    dueDay: 25,
  },
  {
    id: 'loan',
    name: 'Small loan',
    creditor: null,
    originalBalanceMinor: 50_000,
    balanceMinor: 30_000,
    aprBasisPoints: 1_200,
    minimumPaymentMinor: 3_000,
    dueDay: 15,
  },
];

function payment(
  debtId: string,
  amountMinor: number,
  paidAt = '2026-07-10T10:00:00.000Z',
): DebtPayment {
  return {
    id: `${debtId}-${amountMinor}`,
    debtId,
    amountMinor,
    paidAt,
    note: null,
  };
}

describe('debt guidance', () => {
  it('asks for the earliest overdue remaining minimum first', () => {
    expect(
      getDebtGuidance(debts, [], 'avalanche', 20_000, now),
    ).toMatchObject({
      action: 'pay_minimum',
      debtId: 'loan',
      suggestedAmountMinor: 3_000,
      remainingMinimumsMinor: 8_000,
      affordableExtraMinor: 12_000,
    });
  });

  it('subtracts payments already recorded this month', () => {
    expect(
      getDebtGuidance(
        debts,
        [payment('loan', 3_000), payment('card', 2_000)],
        'avalanche',
        20_000,
        now,
      ),
    ).toMatchObject({
      action: 'pay_minimum',
      debtId: 'card',
      suggestedAmountMinor: 3_000,
      paidThisMonthMinor: 5_000,
      remainingMinimumsMinor: 3_000,
      affordableExtraMinor: 12_000,
    });
  });

  it('targets extra money according to avalanche or snowball', () => {
    const payments = [payment('loan', 3_000), payment('card', 5_000)];
    expect(
      getDebtGuidance(debts, payments, 'avalanche', 20_000, now),
    ).toMatchObject({
      action: 'pay_extra',
      debtId: 'card',
      suggestedAmountMinor: 12_000,
    });
    expect(
      getDebtGuidance(debts, payments, 'snowball', 20_000, now),
    ).toMatchObject({
      action: 'pay_extra',
      debtId: 'loan',
      suggestedAmountMinor: 12_000,
    });
  });

  it('does not suggest extra money when recorded cash flow cannot support it', () => {
    expect(
      getDebtGuidance(
        debts,
        [payment('loan', 3_000), payment('card', 5_000)],
        'avalanche',
        6_000,
        now,
      ),
    ).toMatchObject({
      action: 'stay_on_plan',
      affordableExtraMinor: 0,
    });
  });

  it('flags a minimum that cannot cover monthly interest', () => {
    const weakDebt = {
      ...debts[0],
      balanceMinor: 1_000_000,
      minimumPaymentMinor: 1_000,
    };
    expect(
      getDebtGuidance([weakDebt], [], 'avalanche', 50_000, now),
    ).toMatchObject({
      action: 'raise_minimum',
      debtId: 'card',
      suggestedAmountMinor: 20_001,
    });
  });

  it('ignores prior-month payments and caps recommendations at the balance', () => {
    const smallDebt = {
      ...debts[0],
      balanceMinor: 2_000,
      minimumPaymentMinor: 5_000,
    };
    expect(
      getDebtGuidance(
        [smallDebt],
        [payment('card', 5_000, '2026-06-10T10:00:00.000Z')],
        'avalanche',
        50_000,
        now,
      ),
    ).toMatchObject({
      action: 'pay_minimum',
      suggestedAmountMinor: 2_000,
      paidThisMonthMinor: 0,
    });
  });

  it('returns a calm setup state when there is no active debt', () => {
    expect(
      getDebtGuidance([], [], 'snowball', 0, now),
    ).toMatchObject({
      action: 'add_debt',
    });
  });
});
