import { useEffect, useMemo } from 'react';
import { buildLocalReminderPlan } from '@/domain/localReminders';
import { useFinance } from '@/providers/FinanceProvider';
import {
  cancelLocalReminders,
  configureLocalNotifications,
  syncLocalReminders,
} from '@/services/localReminders';

export function ReminderCoordinator() {
  const {
    isLoading,
    recurring,
    expectedIncome,
    budgets,
    savingsGoals,
    preferences,
  } = useFinance();
  const plan = useMemo(
    () =>
      buildLocalReminderPlan({
        recurring,
        expectedIncome,
        budgets,
        savingsGoals,
        options: {
          schedules: preferences.remindSchedules,
          paydays: preferences.remindPaydays,
          weeklyReview: preferences.remindWeeklyReview,
        },
      }),
    [
      budgets,
      expectedIncome,
      preferences.remindPaydays,
      preferences.remindSchedules,
      preferences.remindWeeklyReview,
      recurring,
      savingsGoals,
    ],
  );

  useEffect(() => {
    void configureLocalNotifications().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const update = preferences.remindersEnabled
      ? syncLocalReminders(plan)
      : cancelLocalReminders();
    void update.catch(() => undefined);
  }, [isLoading, plan, preferences.remindersEnabled]);

  return null;
}
