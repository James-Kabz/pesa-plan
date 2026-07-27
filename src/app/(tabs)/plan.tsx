import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { ProgressBar } from '@/components/ProgressBar';
import { formatMoney, getDueStatus } from '@/domain/money';
import {
  getBudgetPacing,
  getBudgetPulse,
  type BudgetPacing,
} from '@/domain/today';
import {
  getRecurringSuggestions,
  type RecurringSuggestion,
} from '@/domain/recurringSuggestion';
import type { RecurringTransaction } from '@/domain/types';
import { useFinance } from '@/providers/FinanceProvider';
import { colors, radius, spacing } from '@/theme';

export default function PlanScreen() {
  const {
    recurring,
    transactions,
    addRecurring,
    recordRecurring,
    removeRecurring,
    budgets,
    preferences,
  } = useFinance();
  const latest = transactions.find((item) => item.type !== 'transfer');
  const today = new Date();
  const dayKey = today.toDateString();
  const budgetPulse = useMemo(
    () => getBudgetPulse(budgets, today),
    [budgets, dayKey],
  );
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);
  const recurringSuggestions = useMemo(
    () =>
      getRecurringSuggestions(transactions, recurring).filter(
        (suggestion) => !dismissedSuggestions.includes(suggestion.key),
      ),
    [dismissedSuggestions, recurring, transactions],
  );

  async function createSuggestedSchedule(suggestion: RecurringSuggestion) {
    try {
      await addRecurring({
        accountId: suggestion.accountId,
        categoryId: suggestion.categoryId,
        type: suggestion.type,
        amountMinor: suggestion.amountMinor,
        note: suggestion.note,
        frequency: suggestion.frequency,
        nextDueAt: suggestion.nextDueAt,
      });
      setDismissedSuggestions((current) => [...current, suggestion.key]);
    } catch {
      Alert.alert('Could not create schedule', 'The suggestion was not saved. Please try again.');
    }
  }

  function confirmSuggestion(suggestion: RecurringSuggestion) {
    const interval =
      suggestion.frequency === 'weekly' ? 'about every 7 days' : 'around the same time each month';
    const nextDue = new Intl.DateTimeFormat('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(suggestion.nextDueAt));
    Alert.alert(
      `Create ${suggestion.frequency} schedule?`,
      `${suggestion.matchCount} confirmed entries occurred ${interval}. The typical amount was ${formatMoney(
        suggestion.amountMinor,
        suggestion.currency,
      )}.\n\nThe next due date will be ${nextDue}. Nothing will be recorded automatically.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create schedule',
          onPress: () => void createSuggestedSchedule(suggestion),
        },
      ],
    );
  }

  function repeatLatest() {
    if (!latest) {
      Alert.alert('Add activity first', 'Record an income or expense, then turn it into a schedule.');
      return;
    }
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    Alert.alert(
      'Repeat monthly?',
      `${latest.note || latest.categoryName} · ${formatMoney(latest.amountMinor, latest.currency)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create schedule',
          onPress: () =>
            void addRecurring({
              accountId: latest.accountId,
              categoryId: latest.categoryId,
              type: latest.type as 'income' | 'expense',
              amountMinor: latest.amountMinor,
              note: latest.note ?? latest.categoryName,
              frequency: 'monthly',
              nextDueAt: next.toISOString(),
            }),
        },
      ],
    );
  }

  function confirmScheduleDelete(schedule: RecurringTransaction) {
    const name = schedule.note || schedule.categoryName;
    Alert.alert(
      'Delete this schedule?',
      `Choose whether to keep transactions already posted from ${name}. Older transactions posted before this update are not linked and must be removed from Activity.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Schedule only',
          onPress: () => void deleteSchedule(schedule, false),
        },
        {
          text: 'Schedule + transactions',
          style: 'destructive',
          onPress: () => void deleteSchedule(schedule, true),
        },
      ],
    );
  }

  async function deleteSchedule(
    schedule: RecurringTransaction,
    deletePostedTransactions: boolean,
  ) {
    try {
      const deletedTransactions = await removeRecurring(
        schedule.id,
        deletePostedTransactions,
      );
      if (deletePostedTransactions && deletedTransactions === 0) {
        Alert.alert(
          'Schedule deleted',
          'No linked posted transactions were found. If this schedule was used before the update, remove that older transaction from Activity.',
        );
      }
    } catch {
      Alert.alert('Could not delete', 'The schedule was not deleted. Please try again.');
    }
  }

  function confirmRecurringPost(schedule: RecurringTransaction) {
    const name = schedule.note || schedule.categoryName;
    Alert.alert(
      `Post ${name}?`,
      `This will add ${formatMoney(
        schedule.amountMinor,
        schedule.accountCurrency,
      )} as a real ${schedule.type} transaction in ${schedule.accountName}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Post transaction',
          onPress: () =>
            void recordRecurring(schedule).catch(() =>
              Alert.alert('Could not post', 'The transaction was not recorded. Please try again.'),
            ),
        },
      ],
    );
  }

  return (
    <Screen>
      <Text style={styles.eyebrow}>SPEND WITH INTENTION</Text>
      <Text style={styles.title}>Plan</Text>
      <Text style={styles.subtitle}>Upcoming recurring income and expenses.</Text>

      <Text style={styles.section}>This month’s budgets</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Set a category budget" style={styles.secondaryAdd} onPress={() => router.push('/budget/editor')}>
        <Ionicons name="add" size={18} color={colors.primary} />
        <Text style={styles.secondaryAddText}>Set a category budget</Text>
      </Pressable>
      {budgets.length ? (
        <View style={styles.pacingGuide}>
          <View style={styles.pacingGuideIcon}>
            <Ionicons name="speedometer-outline" size={21} color={colors.primary} />
          </View>
          <View style={styles.pacingGuideContent}>
            <Text style={styles.pacingGuideLabel}>DAILY BUDGET GUIDE</Text>
            <Text style={styles.pacingGuideValue}>
              {formatMoney(
                budgetPulse.safePerDayMinor,
                preferences.mainCurrency,
              )}
              /day
            </Text>
            <Text style={styles.pacingGuideMeta}>
              Across categories with money left · {budgetPulse.daysRemaining}{' '}
              {budgetPulse.daysRemaining === 1 ? 'day' : 'days'} including today
            </Text>
            <Text style={styles.pacingGuideHint}>
              This is guidance from your remaining category limits, not an automatic spending restriction.
            </Text>
          </View>
        </View>
      ) : null}
      {budgets.map((budget) => {
        const ratio = Math.min(1, budget.spentMinor / budget.limitMinor);
        const remaining = budget.limitMinor - budget.spentMinor;
        const pacing = getBudgetPacing(budget, today);
        const pacingCopy = getPacingCopy(
          pacing,
          preferences.mainCurrency,
        );
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${budget.categoryName} budget. ${pacingCopy}`}
            key={budget.id}
            style={styles.budget}
            onPress={() => router.push({ pathname: '/budget/editor', params: { id: budget.id } })}
          >
            <View style={styles.budgetTop}>
              <Text style={styles.name}>{budget.categoryName}</Text>
              <Text style={[styles.amount, remaining < 0 && { color: colors.expense }]}>
                {formatMoney(Math.abs(remaining), preferences.mainCurrency)} {remaining < 0 ? 'over' : 'left'}
              </Text>
            </View>
            <ProgressBar
              value={ratio}
              label={`${budget.categoryName} budget used`}
              color={
                pacing.status === 'over'
                  ? colors.expense
                  : pacing.status === 'watch'
                    ? colors.warning
                    : colors.primary
              }
              style={styles.track}
            />
            <Text style={styles.meta}>
              {formatMoney(budget.spentMinor, preferences.mainCurrency)} of{' '}
              {formatMoney(budget.limitMinor, preferences.mainCurrency)}
            </Text>
            <View style={styles.pacingRow}>
              <Ionicons
                name={
                  pacing.status === 'over'
                    ? 'alert-circle-outline'
                    : pacing.status === 'watch'
                      ? 'time-outline'
                      : pacing.status === 'used_up'
                        ? 'pause-circle-outline'
                        : 'checkmark-circle-outline'
                }
                size={15}
                color={
                  pacing.status === 'over'
                    ? colors.expense
                    : pacing.status === 'watch' ||
                        pacing.status === 'used_up'
                      ? colors.warning
                      : colors.primary
                }
              />
              <Text
                style={[
                  styles.pacingText,
                  pacing.status === 'over' && styles.pacingTextOver,
                  (pacing.status === 'watch' ||
                    pacing.status === 'used_up') &&
                    styles.pacingTextWatch,
                ]}
              >
                {pacingCopy}
              </Text>
            </View>
          </Pressable>
        );
      })}

      <Pressable accessibilityRole="button" accessibilityLabel="Open sinking funds" style={styles.fundLink} onPress={() => router.push('/funds')}>
        <View style={styles.icon}>
          <Ionicons name="flag-outline" size={19} color={colors.primary} />
        </View>
        <View style={styles.details}>
          <Text style={styles.name}>Sinking funds</Text>
          <Text style={styles.meta}>Prepare for larger, non-monthly expenses</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Open savings goals" style={styles.goalLink} onPress={() => router.push('/goals')}>
        <View style={styles.icon}>
          <Ionicons name="sparkles-outline" size={19} color={colors.primary} />
        </View>
        <View style={styles.details}>
          <Text style={styles.name}>Savings goals</Text>
          <Text style={styles.meta}>Build an emergency fund or another target</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>

      {recurringSuggestions.length ? (
        <>
          <View style={styles.suggestionHeading}>
            <View>
              <Text style={styles.section}>Suggested schedules</Text>
              <Text style={styles.suggestionHeadingHint}>Based only on your confirmed activity</Text>
            </View>
            <View style={styles.localBadge}>
              <Ionicons name="phone-portrait-outline" size={12} color={colors.primary} />
              <Text style={styles.localBadgeText}>On device</Text>
            </View>
          </View>
          <View style={styles.suggestionList}>
            {recurringSuggestions.slice(0, 3).map((suggestion) => {
              const interval =
                suggestion.frequency === 'weekly'
                  ? `${Math.round(suggestion.averageIntervalDays)} days apart`
                  : 'about once a month';
              const nextDue = new Intl.DateTimeFormat('en-KE', {
                day: 'numeric',
                month: 'short',
              }).format(new Date(suggestion.nextDueAt));
              return (
                <View key={suggestion.key} style={styles.suggestionCard}>
                  <View style={styles.suggestionTop}>
                    <View style={styles.suggestionIcon}>
                      <Ionicons
                        name={suggestion.categoryIcon as keyof typeof Ionicons.glyphMap}
                        size={20}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.details}>
                      <Text style={styles.name}>{suggestion.note}</Text>
                      <Text style={styles.suggestionAmount}>
                        {formatMoney(suggestion.amountMinor, suggestion.currency)} ·{' '}
                        {suggestion.frequency}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.suggestionReason}>
                    {suggestion.matchCount} matching entries were {interval}. Suggested next
                    date: {nextDue}.
                  </Text>
                  <Text style={styles.suggestionSafety}>
                    Creates a reminder schedule only. You still confirm every transaction.
                  </Text>
                  <View style={styles.suggestionActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Not now for ${suggestion.note} recurring suggestion`}
                      onPress={() =>
                        setDismissedSuggestions((current) => [
                          ...current,
                          suggestion.key,
                        ])
                      }
                      style={styles.suggestionDismiss}
                    >
                      <Text style={styles.suggestionDismissText}>Not now</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Create suggested ${suggestion.frequency} schedule for ${suggestion.note}`}
                      onPress={() => confirmSuggestion(suggestion)}
                      style={styles.suggestionCreate}
                    >
                      <Ionicons name="add" size={16} color="#FFFFFF" />
                      <Text style={styles.suggestionCreateText}>Create schedule</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      <Pressable accessibilityRole="button" accessibilityLabel="Repeat latest transaction monthly" style={styles.add} onPress={repeatLatest}>
        <Ionicons name="repeat-outline" size={20} color="#FFFFFF" />
        <Text style={styles.addText}>Repeat latest transaction monthly</Text>
      </Pressable>

      <Text style={styles.section}>Schedules</Text>
      {recurring.length ? (
        <View style={styles.list}>
          {recurring.map((item) => {
            const status = getDueStatus(item.nextDueAt);
            const due = new Intl.DateTimeFormat('en-KE', {
              day: 'numeric',
              month: 'short',
            }).format(new Date(item.nextDueAt));
            return (
              <View key={item.id} style={styles.row}>
                <View style={styles.icon}>
                  <Ionicons name="repeat" size={19} color={colors.primary} />
                </View>
                <View style={styles.details}>
                  <Text style={styles.name}>{item.note || item.categoryName}</Text>
                  <Text style={[styles.meta, status === 'overdue' && styles.overdue]}>
                    {item.accountName} · {status === 'overdue' ? 'overdue' : 'due'} {due}
                  </Text>
                </View>
                <View style={styles.right}>
                  <Text style={styles.amount}>
                    {formatMoney(item.amountMinor, item.accountCurrency)}
                  </Text>
                  <View style={styles.scheduleActions}>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Post ${item.note || item.categoryName} now`} onPress={() => confirmRecurringPost(item)}>
                      <Text style={styles.post}>Post now</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${item.note || item.categoryName} schedule`}
                      hitSlop={8}
                      onPress={() => confirmScheduleDelete(item)}
                      style={styles.deleteSchedule}
                    >
                      <Ionicons name="trash-outline" size={15} color={colors.expense} />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No schedules yet</Text>
          <Text style={styles.emptyText}>Recurring items stay manual until you choose to post them.</Text>
        </View>
      )}
    </Screen>
  );
}

function getPacingCopy(pacing: BudgetPacing, currency: string): string {
  if (pacing.status === 'over') {
    return `${formatMoney(
      Math.abs(pacing.remainingMinor),
      currency,
    )} over. Pause or adjust this budget.`;
  }
  if (pacing.status === 'used_up') {
    return 'Limit fully used. Pause this category for the rest of the month.';
  }
  const daily = formatMoney(pacing.safePerDayMinor, currency);
  const projected = formatMoney(pacing.projectedSpentMinor, currency);
  return pacing.status === 'watch'
    ? `${daily}/day from here. Current pace projects ${projected}.`
    : `${daily}/day for ${pacing.daysRemaining} ${
        pacing.daysRemaining === 1 ? 'day' : 'days'
      }. Current pace projects ${projected}.`;
}

const styles = StyleSheet.create({
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginTop: spacing.sm },
  title: { color: colors.ink, fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { color: colors.muted, fontSize: 15, marginTop: spacing.sm, marginBottom: spacing.xl },
  add: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.lg },
  addText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  section: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: spacing.xl, marginBottom: spacing.md },
  list: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  icon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  details: { flex: 1 },
  name: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  meta: { color: colors.muted, fontSize: 11, marginTop: 3 },
  right: { alignItems: 'flex-end' },
  amount: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  post: { color: colors.primary, fontSize: 11, fontWeight: '800', marginTop: spacing.xs },
  scheduleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  deleteSchedule: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  emptyText: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: spacing.sm },
  budget: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  budgetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: { marginVertical: spacing.sm },
  pacingGuide: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#BFD8CA',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  pacingGuideIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pacingGuideContent: { flex: 1 },
  pacingGuideLabel: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  pacingGuideValue: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  pacingGuideMeta: {
    color: colors.ink,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  pacingGuideHint: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: spacing.xs,
  },
  pacingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  pacingText: {
    flex: 1,
    color: colors.primary,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '700',
  },
  pacingTextWatch: { color: colors.warning },
  pacingTextOver: { color: colors.expense },
  secondaryAdd: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  secondaryAddText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  fundLink: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginTop: spacing.xl },
  goalLink: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginTop: spacing.sm },
  suggestionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  suggestionHeadingHint: {
    color: colors.muted,
    fontSize: 11,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  localBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  localBadgeText: { color: colors.primary, fontSize: 9, fontWeight: '800' },
  suggestionList: { gap: spacing.sm },
  suggestionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#BFD8CA',
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  suggestionTop: { flexDirection: 'row', alignItems: 'center' },
  suggestionIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    marginRight: spacing.md,
  },
  suggestionAmount: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
    textTransform: 'capitalize',
  },
  suggestionReason: {
    color: colors.ink,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.md,
  },
  suggestionSafety: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: spacing.xs,
  },
  suggestionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  suggestionDismiss: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  suggestionDismissText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  suggestionCreate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestionCreateText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  overdue: { color: colors.expense, fontWeight: '800' },
});
