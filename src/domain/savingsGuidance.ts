import type { Account, SavingsGoal } from './types';

export type SavingsGuidanceAction =
  | 'create_account'
  | 'create_goal'
  | 'link_goal'
  | 'allocate_goal'
  | 'fund_goal'
  | 'restore_balance'
  | 'all_set';

export interface SavingsAccountAllocation {
  accountId: string;
  accountName: string;
  balanceMinor: number;
  allocatedMinor: number;
  unallocatedMinor: number;
  shortfallMinor: number;
}

export interface SavingsGuidance {
  action: SavingsGuidanceAction;
  title: string;
  reason: string;
  totalBalanceMinor: number;
  totalAllocatedMinor: number;
  totalUnallocatedMinor: number;
  totalShortfallMinor: number;
  accounts: SavingsAccountAllocation[];
  accountId?: string;
  accountName?: string;
  goalId?: string;
  goalName?: string;
  suggestedAmountMinor?: number;
}

function incomplete(goal: SavingsGoal): boolean {
  return goal.savedMinor < goal.targetMinor;
}

export function getSavingsGuidance(
  accounts: Account[],
  goals: SavingsGoal[],
  currency: string,
): SavingsGuidance {
  const savingsAccounts = accounts.filter(
    (account) =>
      account.type === 'savings' && account.currency === currency,
  );
  const accountIds = new Set(savingsAccounts.map((account) => account.id));
  const relevantGoals = goals.filter(
    (goal) => !goal.accountId || accountIds.has(goal.accountId),
  );
  const allocations = savingsAccounts.map((account) => {
    const allocatedMinor = relevantGoals
      .filter((goal) => goal.accountId === account.id)
      .reduce((sum, goal) => sum + goal.savedMinor, 0);
    return {
      accountId: account.id,
      accountName: account.name,
      balanceMinor: account.currentBalanceMinor,
      allocatedMinor,
      unallocatedMinor: Math.max(
        0,
        account.currentBalanceMinor - allocatedMinor,
      ),
      shortfallMinor: Math.max(
        0,
        allocatedMinor - account.currentBalanceMinor,
      ),
    };
  });
  const totals = {
    totalBalanceMinor: allocations.reduce(
      (sum, account) => sum + account.balanceMinor,
      0,
    ),
    totalAllocatedMinor: allocations.reduce(
      (sum, account) => sum + account.allocatedMinor,
      0,
    ),
    totalUnallocatedMinor: allocations.reduce(
      (sum, account) => sum + account.unallocatedMinor,
      0,
    ),
    totalShortfallMinor: allocations.reduce(
      (sum, account) => sum + account.shortfallMinor,
      0,
    ),
  };
  const base = { ...totals, accounts: allocations };

  if (!savingsAccounts.length) {
    return {
      ...base,
      action: 'create_account',
      title: 'Create a real savings account',
      reason:
        'A savings goal should be backed by money held in a savings account.',
    };
  }

  const shortAccount = [...allocations]
    .filter((account) => account.shortfallMinor > 0)
    .sort((a, b) => b.shortfallMinor - a.shortfallMinor)[0];
  if (shortAccount) {
    return {
      ...base,
      action: 'restore_balance',
      title: `${shortAccount.accountName} needs attention`,
      reason:
        'Goal allocations are higher than the current account balance. Restore the balance before allocating more.',
      accountId: shortAccount.accountId,
      accountName: shortAccount.accountName,
      suggestedAmountMinor: shortAccount.shortfallMinor,
    };
  }

  const unlinkedGoal = relevantGoals.find(
    (goal) => !goal.accountId && incomplete(goal),
  );
  if (unlinkedGoal) {
    return {
      ...base,
      action: 'link_goal',
      title: `Connect ${unlinkedGoal.name} to savings`,
      reason:
        'Choose the real savings account that holds the money for this goal.',
      goalId: unlinkedGoal.id,
      goalName: unlinkedGoal.name,
    };
  }

  const candidates = relevantGoals
    .filter((goal) => goal.accountId && incomplete(goal))
    .map((goal) => ({
      goal,
      account: allocations.find(
        (account) => account.accountId === goal.accountId,
      ),
    }))
    .filter(
      (
        item,
      ): item is {
        goal: SavingsGoal;
        account: SavingsAccountAllocation;
      } => Boolean(item.account?.unallocatedMinor),
    )
    .sort((a, b) => {
      const emergencyPriority =
        Number(b.goal.goalType === 'emergency') -
        Number(a.goal.goalType === 'emergency');
      if (emergencyPriority) return emergencyPriority;
      return (
        a.goal.targetMinor -
          a.goal.savedMinor -
        (b.goal.targetMinor - b.goal.savedMinor)
      );
    });
  const allocationCandidate = candidates[0];
  if (allocationCandidate) {
    const remainingGoalMinor =
      allocationCandidate.goal.targetMinor -
      allocationCandidate.goal.savedMinor;
    return {
      ...base,
      action: 'allocate_goal',
      title: `Put available savings toward ${allocationCandidate.goal.name}`,
      reason: `The money is already in ${allocationCandidate.account.accountName}; allocating it will not create an expense.`,
      accountId: allocationCandidate.account.accountId,
      accountName: allocationCandidate.account.accountName,
      goalId: allocationCandidate.goal.id,
      goalName: allocationCandidate.goal.name,
      suggestedAmountMinor: Math.min(
        allocationCandidate.account.unallocatedMinor,
        remainingGoalMinor,
      ),
    };
  }

  if (totals.totalUnallocatedMinor > 0) {
    const availableAccount = [...allocations].sort(
      (a, b) => b.unallocatedMinor - a.unallocatedMinor,
    )[0];
    return {
      ...base,
      action: 'create_goal',
      title: 'Give your available savings a purpose',
      reason:
        'Some money in savings is not assigned to a goal. A goal names its purpose without moving the money.',
      accountId: availableAccount.accountId,
      accountName: availableAccount.accountName,
      suggestedAmountMinor: availableAccount.unallocatedMinor,
    };
  }

  const goalToFund = relevantGoals
    .filter(incomplete)
    .sort((a, b) => {
      const emergencyPriority =
        Number(b.goalType === 'emergency') -
        Number(a.goalType === 'emergency');
      if (emergencyPriority) return emergencyPriority;
      return a.targetMinor - a.savedMinor - (b.targetMinor - b.savedMinor);
    })[0];
  if (goalToFund) {
    const linkedAccount = allocations.find(
      (account) => account.accountId === goalToFund.accountId,
    );
    return {
      ...base,
      action: 'fund_goal',
      title: `Build ${goalToFund.name} with real savings`,
      reason:
        'Transfer money into its linked savings account before allocating more to this goal.',
      accountId: linkedAccount?.accountId,
      accountName: linkedAccount?.accountName,
      goalId: goalToFund.id,
      goalName: goalToFund.name,
    };
  }

  return {
    ...base,
    action: 'all_set',
    title: 'Your savings have clear purposes',
    reason:
      'Every available amount is allocated and your current goals are fully funded.',
  };
}
