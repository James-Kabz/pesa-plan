import { describe, expect, it } from 'vitest';
import type { Account, SavingsGoal } from './types';
import { getSavingsGuidance } from './savingsGuidance';

const savings = {
  id: 'savings',
  name: 'Savings',
  type: 'savings',
  currency: 'KES',
  openingBalanceMinor: 100_000,
  currentBalanceMinor: 100_000,
  color: '#175C45',
  createdAt: '2026-07-01',
} as Account;
const emergency = {
  id: 'emergency',
  name: 'Emergency fund',
  targetMinor: 150_000,
  savedMinor: 40_000,
  goalType: 'emergency',
  accountId: savings.id,
  accountName: savings.name,
  accountBalanceMinor: savings.currentBalanceMinor,
  targetDate: null,
  color: '#175C45',
} as SavingsGoal;
const holiday = {
  ...emergency,
  id: 'holiday',
  name: 'Holiday',
  targetMinor: 80_000,
  savedMinor: 20_000,
  goalType: 'general',
} as SavingsGoal;

describe('savings guidance', () => {
  it('calculates real account allocation and recommends emergency savings first', () => {
    expect(
      getSavingsGuidance([savings], [holiday, emergency], 'KES'),
    ).toMatchObject({
      action: 'allocate_goal',
      totalBalanceMinor: 100_000,
      totalAllocatedMinor: 60_000,
      totalUnallocatedMinor: 40_000,
      goalId: 'emergency',
      suggestedAmountMinor: 40_000,
      accounts: [
        {
          allocatedMinor: 60_000,
          unallocatedMinor: 40_000,
          shortfallMinor: 0,
        },
      ],
    });
  });

  it('caps a suggestion at the amount remaining for the goal', () => {
    expect(
      getSavingsGuidance(
        [{ ...savings, currentBalanceMinor: 200_000 }],
        [{ ...emergency, savedMinor: 140_000 }],
        'KES',
      ),
    ).toMatchObject({
      action: 'allocate_goal',
      suggestedAmountMinor: 10_000,
    });
  });

  it('recommends a new purpose when money has no eligible goal', () => {
    expect(getSavingsGuidance([savings], [], 'KES')).toMatchObject({
      action: 'create_goal',
      accountId: 'savings',
      suggestedAmountMinor: 100_000,
    });
  });

  it('keeps a new-goal suggestion within one real account balance', () => {
    expect(
      getSavingsGuidance(
        [
          savings,
          {
            ...savings,
            id: 'second-savings',
            name: 'Second savings',
            currentBalanceMinor: 80_000,
          },
        ],
        [],
        'KES',
      ),
    ).toMatchObject({
      action: 'create_goal',
      totalUnallocatedMinor: 180_000,
      accountId: 'savings',
      suggestedAmountMinor: 100_000,
    });
  });

  it('detects allocations that exceed the current real balance', () => {
    expect(
      getSavingsGuidance(
        [{ ...savings, currentBalanceMinor: 30_000 }],
        [emergency],
        'KES',
      ),
    ).toMatchObject({
      action: 'restore_balance',
      totalShortfallMinor: 10_000,
      suggestedAmountMinor: 10_000,
    });
  });

  it('guides unlinked goals and goals that need fresh savings', () => {
    expect(
      getSavingsGuidance(
        [savings],
        [{ ...emergency, accountId: null, accountName: null }],
        'KES',
      ),
    ).toMatchObject({
      action: 'link_goal',
      goalId: 'emergency',
    });
    expect(
      getSavingsGuidance(
        [{ ...savings, currentBalanceMinor: 40_000 }],
        [emergency],
        'KES',
      ),
    ).toMatchObject({
      action: 'fund_goal',
      goalId: 'emergency',
    });
  });

  it('ignores other currencies and recognizes fully allocated goals', () => {
    const usd = {
      ...savings,
      id: 'usd',
      currency: 'USD',
      currentBalanceMinor: 900_000,
    };
    expect(
      getSavingsGuidance(
        [savings, usd],
        [{ ...emergency, targetMinor: 100_000, savedMinor: 100_000 }],
        'KES',
      ),
    ).toMatchObject({
      action: 'all_set',
      totalBalanceMinor: 100_000,
      totalAllocatedMinor: 100_000,
      totalUnallocatedMinor: 0,
    });
  });
});
