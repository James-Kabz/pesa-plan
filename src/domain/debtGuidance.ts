import { orderDebts } from './money';
import type { Debt, DebtPayment, DebtStrategy } from './types';

export type DebtGuidanceAction =
  | 'add_debt'
  | 'raise_minimum'
  | 'pay_minimum'
  | 'pay_extra'
  | 'stay_on_plan';

export interface DebtGuidance {
  action: DebtGuidanceAction;
  title: string;
  reason: string;
  strategy: DebtStrategy;
  debtId?: string;
  debtName?: string;
  suggestedAmountMinor?: number;
  paidThisMonthMinor: number;
  remainingMinimumsMinor: number;
  affordableExtraMinor: number;
}

interface DebtPaymentProgress {
  debt: Debt;
  paidThisMonthMinor: number;
  remainingMinimumMinor: number;
}

function isInLocalMonth(date: string, now: Date): boolean {
  const paidAt = new Date(date);
  return (
    paidAt.getFullYear() === now.getFullYear() &&
    paidAt.getMonth() === now.getMonth()
  );
}

function monthlyInterestMinor(debt: Debt): number {
  return Math.ceil(
    debt.balanceMinor * (debt.aprBasisPoints / 10_000 / 12),
  );
}

function strategyLabel(strategy: DebtStrategy): string {
  return strategy === 'avalanche'
    ? 'highest-interest debt'
    : 'smallest balance';
}

export function getDebtGuidance(
  debts: Debt[],
  payments: DebtPayment[],
  strategy: DebtStrategy,
  monthlyNetMinor: number,
  now = new Date(),
): DebtGuidance {
  const activeDebts = debts.filter((debt) => debt.balanceMinor > 0);
  const paidByDebt = new Map<string, number>();
  payments
    .filter((payment) => isInLocalMonth(payment.paidAt, now))
    .forEach((payment) => {
      paidByDebt.set(
        payment.debtId,
        (paidByDebt.get(payment.debtId) ?? 0) + payment.amountMinor,
      );
    });

  const paidThisMonthMinor = [...paidByDebt.values()].reduce(
    (sum, amount) => sum + amount,
    0,
  );
  if (!activeDebts.length) {
    return {
      action: 'add_debt',
      title: 'No active debt plan yet',
      reason: 'Add a debt only if you have one. Pesa Plan will keep the payoff guidance simple.',
      strategy,
      paidThisMonthMinor,
      remainingMinimumsMinor: 0,
      affordableExtraMinor: 0,
    };
  }

  const ordered = orderDebts(activeDebts, strategy);
  const progress: DebtPaymentProgress[] = ordered.map((debt) => {
    const paid = paidByDebt.get(debt.id) ?? 0;
    return {
      debt,
      paidThisMonthMinor: paid,
      remainingMinimumMinor: Math.max(0, debt.minimumPaymentMinor - paid),
    };
  });
  const remainingMinimumsMinor = progress.reduce(
    (sum, item) => sum + item.remainingMinimumMinor,
    0,
  );
  const affordableAfterRecordedPayments = Math.max(
    0,
    monthlyNetMinor - paidThisMonthMinor,
  );
  const affordableExtraMinor = Math.max(
    0,
    affordableAfterRecordedPayments - remainingMinimumsMinor,
  );

  const weakMinimum = progress
    .filter(
      ({ debt, paidThisMonthMinor: paid }) =>
        debt.aprBasisPoints > 0 &&
        debt.minimumPaymentMinor <= monthlyInterestMinor(debt) &&
        paid < monthlyInterestMinor(debt) + 1,
    )
    .sort(
      (a, b) =>
        monthlyInterestMinor(b.debt) - monthlyInterestMinor(a.debt),
    )[0];
  if (weakMinimum) {
    const interest = monthlyInterestMinor(weakMinimum.debt);
    return {
      action: 'raise_minimum',
      title: `${weakMinimum.debt.name} needs a stronger payment`,
      reason:
        `Its listed minimum does not cover roughly this month's interest. ` +
        'Paying slightly more prevents the balance from growing.',
      strategy,
      debtId: weakMinimum.debt.id,
      debtName: weakMinimum.debt.name,
      suggestedAmountMinor: Math.min(
        weakMinimum.debt.balanceMinor,
        Math.max(1, interest + 1 - weakMinimum.paidThisMonthMinor),
      ),
      paidThisMonthMinor,
      remainingMinimumsMinor,
      affordableExtraMinor,
    };
  }

  const unpaidMinimums = progress.filter(
    (item) => item.remainingMinimumMinor > 0,
  );
  if (unpaidMinimums.length) {
    const nextMinimum = [...unpaidMinimums].sort((a, b) => {
      const aDue = a.debt.dueDay ?? 32;
      const bDue = b.debt.dueDay ?? 32;
      const aPassed = aDue < now.getDate() ? 0 : 1;
      const bPassed = bDue < now.getDate() ? 0 : 1;
      return aPassed - bPassed || aDue - bDue;
    })[0];
    const dueText = nextMinimum.debt.dueDay
      ? nextMinimum.debt.dueDay < now.getDate()
        ? `Its day ${nextMinimum.debt.dueDay} due date has passed`
        : `It is due on day ${nextMinimum.debt.dueDay}`
      : 'Cover every minimum before making an extra payment';
    return {
      action: 'pay_minimum',
      title: `Cover ${nextMinimum.debt.name}'s remaining minimum`,
      reason: `${dueText}. Extra money will then target the ${strategyLabel(strategy)}.`,
      strategy,
      debtId: nextMinimum.debt.id,
      debtName: nextMinimum.debt.name,
      suggestedAmountMinor: Math.min(
        nextMinimum.debt.balanceMinor,
        nextMinimum.remainingMinimumMinor,
      ),
      paidThisMonthMinor,
      remainingMinimumsMinor,
      affordableExtraMinor,
    };
  }

  const focusDebt = ordered[0];
  if (affordableExtraMinor > 0) {
    return {
      action: 'pay_extra',
      title: `Put your available extra toward ${focusDebt.name}`,
      reason:
        `All listed minimums are covered this month. Your ${strategy} plan focuses extra money on the ${strategyLabel(strategy)}.`,
      strategy,
      debtId: focusDebt.id,
      debtName: focusDebt.name,
      suggestedAmountMinor: Math.min(
        focusDebt.balanceMinor,
        affordableExtraMinor,
      ),
      paidThisMonthMinor,
      remainingMinimumsMinor,
      affordableExtraMinor,
    };
  }

  return {
    action: 'stay_on_plan',
    title: 'This month’s minimums are covered',
    reason:
      `No safe extra payment is suggested from recorded monthly cash flow. ` +
      `Keep the ${strategyLabel(strategy)} as your next focus.`,
    strategy,
    debtId: focusDebt.id,
    debtName: focusDebt.name,
    paidThisMonthMinor,
    remainingMinimumsMinor,
    affordableExtraMinor,
  };
}
