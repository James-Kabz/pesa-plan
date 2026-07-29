import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { TransactionRow } from '@/components/TransactionRow';
import { getTimeGreeting } from '@/domain/greeting';
import { formatMoney, getDueStatus } from '@/domain/money';
import {
  getSavingsGuidance,
  type SavingsGuidance,
} from '@/domain/savingsGuidance';
import {
  buildTodayPriority,
  getBudgetGuidance,
  getBudgetPulse,
  getUpcomingSchedules,
  type BudgetGuidance,
  type TodayPriority,
} from '@/domain/today';
import type { RecurringTransaction } from '@/domain/types';
import { useFinance } from '@/providers/FinanceProvider';
import { colors, radius, spacing } from '@/theme';

export default function DashboardScreen() {
  const {
    accounts,
    monthlySummary,
    transactions,
    preferences,
    expectedIncome,
    recurring,
    budgets,
    savingsGoals,
    debts,
    debtPayments,
    recordRecurring,
  } = useFinance();
  const [amountsVisible, setAmountsVisible] = useState(true);
  const [greeting, setGreeting] = useState(() => getTimeGreeting());
  const privateValue = (value: string) => (amountsVisible ? value : '••••••');
  const totalBalance = accounts
    .filter((account) => account.currency === preferences.mainCurrency)
    .reduce((sum, account) => sum + account.currentBalanceMinor, 0);
  const expectedMonthlyIncome = expectedIncome
    .filter((income) =>
      accounts.some(
        (account) =>
          account.id === income.accountId && account.currency === preferences.mainCurrency,
      ),
    )
    .reduce((sum, income) => sum + income.amountMinor, 0);
  const incomeStillExpected = Math.max(0, expectedMonthlyIncome - monthlySummary.incomeMinor);
  const today = new Date();
  const dayKey = today.toDateString();
  const budgetPulse = useMemo(() => getBudgetPulse(budgets), [budgets]);
  const savingsGuidance = useMemo(
    () =>
      getSavingsGuidance(
        accounts,
        savingsGoals,
        preferences.mainCurrency,
      ),
    [
      accounts,
      preferences.mainCurrency,
      savingsGoals,
    ],
  );
  const hasSavingsIntent =
    savingsGuidance.accounts.length > 0 || savingsGoals.length > 0;
  const upcomingSchedules = useMemo(
    () => getUpcomingSchedules(recurring, preferences.mainCurrency, today),
    [dayKey, preferences.mainCurrency, recurring],
  );
  const priority = useMemo(
    () =>
      buildTodayPriority({
        now: today,
        currency: preferences.mainCurrency,
        accounts,
        recurring,
        budgets,
        expectedIncome,
        monthlySummary,
        savingsGoals,
        debts,
        debtPayments,
        debtStrategy: preferences.debtStrategy,
      }),
    [
      accounts,
      budgets,
      expectedIncome,
      monthlySummary,
      preferences.mainCurrency,
      recurring,
      savingsGoals,
      debts,
      debtPayments,
      preferences.debtStrategy,
      dayKey,
    ],
  );
  const savingsIsPriority =
    priority.kind === 'savings_setup' ||
    priority.kind === 'savings_unallocated' ||
    priority.kind === 'savings_shortfall' ||
    priority.kind === 'savings_funding';
  const watchedBudgets = useMemo(
    () =>
      [...budgets]
        .sort((a, b) => {
          const rank = {
            over: 4,
            used_up: 3,
            tight: 2,
            comfortable: 1,
            untouched: 0,
          };
          const aGuidance = getBudgetGuidance(a);
          const bGuidance = getBudgetGuidance(b);
          return (
            rank[bGuidance.status] -
              rank[aGuidance.status] ||
            b.spentMinor / b.limitMinor -
              a.spentMinor / a.limitMinor
          );
        })
        .slice(0, 3),
    [budgets, dayKey],
  );
  const month = new Intl.DateTimeFormat('en-KE', { month: 'long', year: 'numeric' }).format(
    new Date(),
  );

  useEffect(() => {
    const timer = setInterval(() => setGreeting(getTimeGreeting()), 60_000);
    return () => clearInterval(timer);
  }, []);

  function handlePriorityAction(item: TodayPriority) {
    switch (item.action) {
      case 'review_recurring':
      case 'review_budget':
        router.push('/(tabs)/plan');
        break;
      case 'record_income':
        router.push({ pathname: '/transaction/new', params: { type: 'income' } });
        break;
      case 'create_budget':
        router.push('/budget/editor');
        break;
      case 'create_goal':
        openSavingsGuidance(savingsGuidance);
        break;
      case 'review_savings':
        openSavingsGuidance(savingsGuidance);
        break;
      case 'review_debt':
        router.push({
          pathname: '/debt/editor',
          params: {
            id: item.itemId,
            suggestedMinor: item.amountMinor,
          },
        });
        break;
      default:
        router.push('/transaction/new');
    }
  }

  function openSavingsGuidance(guidance: SavingsGuidance) {
    switch (guidance.action) {
      case 'allocate_goal':
      case 'link_goal':
        router.push({
          pathname: '/goal/editor',
          params: {
            id: guidance.goalId,
            suggestedMinor:
              guidance.action === 'allocate_goal'
                ? guidance.suggestedAmountMinor
                : undefined,
          },
        });
        break;
      case 'create_goal':
        router.push({
          pathname: '/goal/editor',
          params: { accountId: guidance.accountId },
        });
        break;
      case 'fund_goal':
      case 'restore_balance':
        router.push({
          pathname: '/transfer/new',
          params: { toAccountId: guidance.accountId },
        });
        break;
      case 'create_account':
        router.push('/account/editor');
        break;
      default:
        router.push('/goals');
    }
  }

  function confirmRecurring(schedule: RecurringTransaction) {
    const name = schedule.note || schedule.categoryName;
    Alert.alert(
      `Record ${name}?`,
      `This will add ${formatMoney(schedule.amountMinor, schedule.accountCurrency)} as a real ${schedule.type} transaction. Nothing is recorded automatically.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Record now',
          onPress: () =>
            void recordRecurring(schedule).catch(() =>
              Alert.alert('Could not record', 'The scheduled transaction was not posted.'),
            ),
        },
      ],
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>TODAY</Text>
          <Text style={styles.greeting}>{greeting}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open accounts"
            style={styles.headerButton}
            onPress={() => router.push('/accounts')}
          >
            <Ionicons name="wallet-outline" size={20} color={colors.primary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open privacy and data settings"
            style={styles.headerButton}
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="person-outline" size={19} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <PriorityCard priority={priority} onPress={() => handlePriorityAction(priority)} />

      <LinearGradient
        colors={[colors.primary, colors.dark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.balanceCard}
      >
        <View style={styles.balanceTop}>
          <Text style={styles.balanceLabel}>{preferences.mainCurrency} account balance</Text>
          <View style={styles.balanceControls}>
            <Text style={styles.month}>{month}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={amountsVisible ? 'Hide all amounts' : 'Show all amounts'}
              hitSlop={10}
              style={styles.visibilityButton}
              onPress={() => setAmountsVisible((visible) => !visible)}
            >
              <Ionicons
                name={amountsVisible ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#FFFFFF"
              />
            </Pressable>
          </View>
        </View>
        <Text
          accessibilityLabel={
            amountsVisible ? formatMoney(totalBalance, preferences.mainCurrency) : 'Balance hidden'
          }
          style={styles.balance}
        >
          {privateValue(formatMoney(totalBalance, preferences.mainCurrency))}
        </Text>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.cardMeta}>Income</Text>
            <Text style={styles.cardValue}>
              {privateValue(
                `+${formatMoney(monthlySummary.incomeMinor, preferences.mainCurrency)}`,
              )}
            </Text>
          </View>
          <View style={styles.divider} />
          <View>
            <Text style={styles.cardMeta}>Spent</Text>
            <Text style={styles.cardValue}>
              {privateValue(
                `−${formatMoney(monthlySummary.expenseMinor, preferences.mainCurrency)}`,
              )}
            </Text>
          </View>
          <View style={styles.divider} />
          <View>
            <Text style={styles.cardMeta}>Saved</Text>
            <Text style={styles.cardValue}>
              {privateValue(`${monthlySummary.savingsRate.toFixed(0)}%`)}
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Manage accounts"
          onPress={() => router.push('/accounts')}
          style={({ pressed }) => [
            styles.manageAccounts,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.manageAccountsLabel}>
            <Ionicons name="wallet-outline" size={17} color="#FFFFFF" />
            <Text style={styles.manageAccountsText}>Manage accounts</Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color="#FFFFFF" />
        </Pressable>
      </LinearGradient>

      <View style={styles.quickActions}>
        <QuickAction
          icon="add"
          label="Add income"
          onPress={() => router.push({ pathname: '/transaction/new', params: { type: 'income' } })}
        />
        <QuickAction
          icon="remove"
          label="Add expense"
          onPress={() => router.push({ pathname: '/transaction/new', params: { type: 'expense' } })}
        />
        <QuickAction
          icon="swap-horizontal-outline"
          label="Transfer"
          onPress={() => router.push('/transfer/new')}
        />
      </View>

      <SectionHeader title="At a glance" />
      <View style={styles.glanceGrid}>
        <GlanceCard
          icon="calendar-outline"
          label="Next 7 days"
          value={upcomingSchedules.length ? `${upcomingSchedules.length} due` : 'Clear'}
          meta={
            upcomingSchedules.length
              ? privateValue(
                  formatMoney(
                    upcomingSchedules.reduce((sum, item) => sum + item.amountMinor, 0),
                    preferences.mainCurrency,
                  ),
                )
              : 'Nothing scheduled'
          }
        />
        <GlanceCard
          icon="compass-outline"
          label="Budget pulse"
          value={
            budgetPulse.status === 'none'
              ? 'Not set'
              : budgetPulse.status === 'over'
                ? 'Over'
                : budgetPulse.status === 'watch'
                  ? 'Watch'
                  : 'On track'
          }
          meta={
            budgetPulse.status === 'none'
              ? 'Add a simple plan'
              : privateValue(
                  `${formatMoney(
                    budgetPulse.availableMinor,
                    preferences.mainCurrency,
                  )} left${
                    budgetPulse.attentionCount
                      ? ` · ${budgetPulse.attentionCount} to review`
                      : ''
                  }`,
                )
          }
          warning={budgetPulse.status === 'over' || budgetPulse.status === 'watch'}
        />
      </View>

      {expectedMonthlyIncome ? (
        <View style={styles.planCard}>
          <View style={styles.planIcon}>
            <Ionicons name="cash-outline" size={21} color={colors.primary} />
          </View>
          <View style={styles.planText}>
            <Text style={styles.planTitle}>Monthly income plan</Text>
            <Text style={styles.planMeta}>
              {privateValue(
                `${formatMoney(monthlySummary.incomeMinor, preferences.mainCurrency)} recorded`,
              )}
              {' · '}
              {privateValue(
                `${formatMoney(incomeStillExpected, preferences.mainCurrency)} still expected`,
              )}
            </Text>
          </View>
        </View>
      ) : null}

      {hasSavingsIntent &&
      savingsGuidance.action !== 'all_set' &&
      !savingsIsPriority ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${savingsGuidance.title}. ${savingsGuidance.reason}`}
          onPress={() => openSavingsGuidance(savingsGuidance)}
          style={({ pressed }) => [
            styles.savingsGuide,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.savingsGuideIcon}>
            <Ionicons
              name={
                savingsGuidance.action === 'restore_balance'
                  ? 'alert-circle-outline'
                  : 'sparkles-outline'
              }
              size={21}
              color={
                savingsGuidance.action === 'restore_balance'
                  ? colors.warning
                  : colors.primary
              }
            />
          </View>
          <View style={styles.savingsGuideContent}>
            <Text style={styles.savingsGuideLabel}>SAVINGS GUIDANCE</Text>
            <Text style={styles.savingsGuideTitle}>
              {savingsGuidance.title}
            </Text>
            <Text style={styles.savingsGuideReason}>
              {savingsGuidance.reason}
            </Text>
            <View style={styles.savingsGuideAction}>
              {savingsGuidance.suggestedAmountMinor ? (
                <Text style={styles.savingsGuideAmount}>
                  {privateValue(
                    formatMoney(
                      savingsGuidance.suggestedAmountMinor,
                      preferences.mainCurrency,
                    ),
                  )}
                </Text>
              ) : null}
              <Text style={styles.savingsGuideActionText}>
                {getSavingsActionLabel(savingsGuidance)}
              </Text>
              <Ionicons name="arrow-forward" size={15} color={colors.primary} />
            </View>
          </View>
        </Pressable>
      ) : null}

      {upcomingSchedules.length ? (
        <>
          <View style={styles.smartSection}>
            <SectionHeader title="Coming up" action="Next 7 days" />
          </View>
          <View style={styles.smartList}>
            {upcomingSchedules.slice(0, 3).map((schedule) => (
              <ScheduleRow
                key={schedule.id}
                schedule={schedule}
                amountsVisible={amountsVisible}
                onRecord={() => confirmRecurring(schedule)}
              />
            ))}
          </View>
        </>
      ) : null}

      {watchedBudgets.length ? (
        <>
          <View style={styles.smartSection}>
            <SectionHeader title="Budget watch" action="Highest use" />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open monthly budgets"
            onPress={() => router.push('/(tabs)/plan')}
            style={styles.budgetWatch}
          >
            {watchedBudgets.map((budget) => {
              const spendAmounts = transactions
                .filter(
                  (transaction) =>
                    transaction.type === 'expense' &&
                    transaction.categoryId === budget.categoryId &&
                    transaction.currency === preferences.mainCurrency &&
                    transaction.occurredAt.slice(0, 7) === budget.month,
                )
                .map((transaction) => transaction.amountMinor);
              const guidance = getBudgetGuidance(budget, spendAmounts);
              const paceLabel =
                guidance.status === 'over'
                  ? 'Over budget'
                  : guidance.status === 'used_up'
                    ? 'Budget used'
                    : guidance.status === 'tight'
                      ? 'Little room left'
                      : guidance.status === 'untouched'
                        ? 'Ready when needed'
                        : 'Room available';
              return (
                <View key={budget.id} style={styles.budgetWatchRow}>
                  <View style={styles.budgetWatchTop}>
                    <Text style={styles.budgetWatchName}>{budget.categoryName}</Text>
                    <Text
                      style={[
                        styles.budgetWatchValue,
                        guidance.status === 'over' && styles.negativeText,
                        (guidance.status === 'tight' ||
                          guidance.status === 'used_up') &&
                          styles.warningText,
                      ]}
                    >
                      {privateValue(
                        `${Math.round((budget.spentMinor / budget.limitMinor) * 100)}%`,
                      )}
                    </Text>
                  </View>
                  <View style={styles.budgetTrack}>
                    <View
                      style={[
                        styles.budgetFill,
                        {
                          width: `${Math.min(
                            100,
                            (budget.spentMinor / budget.limitMinor) * 100,
                          )}%`,
                        },
                        (guidance.status === 'tight' ||
                          guidance.status === 'used_up') &&
                          styles.budgetFillWatch,
                        guidance.status === 'over' && styles.budgetFillOver,
                      ]}
                    />
                  </View>
                  <View style={styles.budgetPaceMeta}>
                    <Text
                      style={[
                        styles.budgetPaceStatus,
                        guidance.status === 'over' && styles.negativeText,
                        (guidance.status === 'tight' ||
                          guidance.status === 'used_up') &&
                          styles.warningText,
                      ]}
                    >
                      {paceLabel}
                    </Text>
                    <Text style={styles.budgetPaceDaily}>
                      {privateValue(
                        getCompactBudgetGuidance(
                          guidance,
                          preferences.mainCurrency,
                        ),
                      )}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Pressable>
        </>
      ) : null}

      <View style={styles.smartSection}>
      <SectionHeader title="Accounts" action={`${accounts.length} total`} />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.accountList}
      >
        {accounts.map((account) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${account.name} account`}
            key={account.id}
            onPress={() =>
              router.push({
                pathname: '/account/editor',
                params: { id: account.id },
              })
            }
            style={({ pressed }) => [
              styles.accountCard,
              { borderTopColor: account.color },
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.accountType}>{account.type.replace('_', ' ')}</Text>
            <Text style={styles.accountName}>{account.name}</Text>
            <Text style={styles.accountBalance}>
              {privateValue(formatMoney(account.currentBalanceMinor, account.currency))}
            </Text>
            <View style={styles.accountEdit}>
              <Ionicons name="pencil-outline" size={12} color={colors.primary} />
              <Text style={styles.accountEditText}>Edit account</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.recentHeader}>
        <SectionHeader title="Recent activity" action={transactions.length ? 'Latest' : undefined} />
      </View>
      <View style={styles.activityCard}>
        {transactions.length ? (
          transactions.slice(0, 3).map((transaction, index) => (
            <View key={transaction.id}>
              <TransactionRow transaction={transaction} amountsVisible={amountsVisible} />
              {index < Math.min(transactions.length, 3) - 1 ? (
                <View style={styles.rowDivider} />
              ) : null}
            </View>
          ))
        ) : (
          <View style={styles.emptyCompact}>
            <Ionicons name="receipt-outline" size={28} color={colors.primary} />
            <Text style={styles.emptyTitle}>Your story starts here</Text>
            <Text style={styles.emptyMessage}>Add your first income or expense to see cash flow.</Text>
          </View>
        )}
      </View>
    </Screen>
  );
}

function getCompactBudgetGuidance(
  guidance: BudgetGuidance,
  currency: string,
): string {
  if (guidance.status === 'over') {
    return `${formatMoney(Math.abs(guidance.remainingMinor), currency)} over`;
  }
  if (guidance.status === 'used_up') return 'No room left';
  if (guidance.status === 'untouched') return 'Full budget left';
  if (guidance.typicalSpendMinor && guidance.similarSpendsLeft !== null) {
    return guidance.similarSpendsLeft > 0
      ? `About ${guidance.similarSpendsLeft} similar ${
          guidance.similarSpendsLeft === 1 ? 'spend' : 'spends'
        } left`
      : 'Below one recent spend';
  }
  return `${Math.round(guidance.remainingRatio * 100)}% left`;
}

function getSavingsActionLabel(guidance: SavingsGuidance): string {
  switch (guidance.action) {
    case 'allocate_goal':
      return 'Review allocation';
    case 'create_goal':
      return 'Create goal';
    case 'link_goal':
      return 'Link goal';
    case 'fund_goal':
      return 'Transfer to savings';
    case 'restore_balance':
      return 'Restore balance';
    case 'create_account':
      return 'Create account';
    default:
      return 'Open savings';
  }
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={21} color={colors.primary} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function PriorityCard({
  priority,
  onPress,
}: {
  priority: TodayPriority;
  onPress: () => void;
}) {
  const icon: keyof typeof Ionicons.glyphMap =
    priority.tone === 'urgent'
      ? 'alert-circle-outline'
      : priority.tone === 'warning'
        ? 'time-outline'
        : priority.tone === 'positive'
          ? 'checkmark-circle-outline'
          : 'sparkles-outline';
  return (
    <View
      style={[
        styles.priorityCard,
        priority.tone === 'urgent' && styles.priorityUrgent,
        priority.tone === 'warning' && styles.priorityWarning,
      ]}
    >
      <View
        style={[
          styles.priorityIcon,
          priority.tone === 'urgent' && styles.priorityIconUrgent,
          priority.tone === 'warning' && styles.priorityIconWarning,
        ]}
      >
        <Ionicons
          name={icon}
          size={24}
          color={priority.tone === 'urgent' ? colors.expense : colors.primary}
        />
      </View>
      <View style={styles.priorityContent}>
        <Text style={styles.priorityLabel}>WHAT NEEDS ATTENTION</Text>
        <Text style={styles.priorityTitle}>{priority.title}</Text>
        <Text style={styles.priorityReason}>{priority.reason}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={priority.actionLabel}
          onPress={onPress}
          style={({ pressed }) => [styles.priorityAction, pressed && styles.pressed]}
        >
          <Text style={styles.priorityActionText}>{priority.actionLabel}</Text>
          <Ionicons name="arrow-forward" size={17} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

function GlanceCard({
  icon,
  label,
  value,
  meta,
  warning = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  meta: string;
  warning?: boolean;
}) {
  return (
    <View style={styles.glanceCard}>
      <View style={styles.glanceTop}>
        <Ionicons name={icon} size={18} color={warning ? colors.warning : colors.primary} />
        <Text style={styles.glanceLabel}>{label}</Text>
      </View>
      <Text style={[styles.glanceValue, warning && styles.warningText]}>{value}</Text>
      <Text style={styles.glanceMeta}>{meta}</Text>
    </View>
  );
}

function ScheduleRow({
  schedule,
  amountsVisible,
  onRecord,
}: {
  schedule: RecurringTransaction;
  amountsVisible: boolean;
  onRecord: () => void;
}) {
  const status = getDueStatus(schedule.nextDueAt);
  const due = new Intl.DateTimeFormat('en-KE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(schedule.nextDueAt));
  return (
    <View style={styles.scheduleRow}>
      <View style={[styles.scheduleIcon, status === 'overdue' && styles.scheduleIconOverdue]}>
        <Ionicons
          name={schedule.type === 'income' ? 'arrow-down-outline' : 'arrow-up-outline'}
          size={19}
          color={status === 'overdue' ? colors.expense : colors.primary}
        />
      </View>
      <View style={styles.scheduleContent}>
        <Text style={styles.scheduleName}>{schedule.note || schedule.categoryName}</Text>
        <Text style={[styles.scheduleMeta, status === 'overdue' && styles.negativeText]}>
          {status === 'overdue' ? 'Overdue' : `Due ${due}`} · {schedule.accountName}
        </Text>
      </View>
      <View style={styles.scheduleRight}>
        <Text style={styles.scheduleAmount}>
          {amountsVisible
            ? formatMoney(schedule.amountMinor, schedule.accountCurrency)
            : '••••••'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Record ${schedule.note || schedule.categoryName} now`}
          onPress={onRecord}
        >
          <Text style={styles.scheduleAction}>Record</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  greeting: {
    color: colors.ink,
    fontSize: 29,
    fontWeight: '800',
    letterSpacing: -0.9,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  priorityUrgent: { borderColor: '#E8B5AD', backgroundColor: '#FFF9F7' },
  priorityWarning: { borderColor: '#E8D2A8', backgroundColor: '#FFFCF5' },
  priorityIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityIconUrgent: { backgroundColor: colors.expenseSoft },
  priorityIconWarning: { backgroundColor: '#F8EED8' },
  priorityContent: { flex: 1 },
  priorityLabel: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  priorityTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', marginTop: 4 },
  priorityReason: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  priorityAction: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  priorityActionText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  balanceCard: {
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  balanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  visibilityButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.12)' },
  balanceLabel: {
    color: '#C5D6CD',
    fontSize: 13,
    fontWeight: '600',
  },
  month: {
    color: '#C5D6CD',
    fontSize: 12,
  },
  balance: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
    marginTop: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  manageAccounts: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  manageAccountsLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  manageAccountsText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  cardMeta: {
    color: '#AFC4BA',
    fontSize: 11,
    marginBottom: spacing.xs,
  },
  cardValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  planIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  planText: { flex: 1 },
  planTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  planMeta: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 3 },
  savingsGuide: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#BFD8CA',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  savingsGuideIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  savingsGuideContent: { flex: 1 },
  savingsGuideLabel: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  savingsGuideTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 3,
  },
  savingsGuideReason: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 3,
  },
  savingsGuideAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  savingsGuideAmount: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '800',
    marginRight: spacing.xs,
  },
  savingsGuideActionText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginVertical: spacing.xl,
  },
  glanceGrid: { flexDirection: 'row', gap: spacing.md },
  glanceCard: {
    flex: 1,
    minHeight: 116,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  glanceTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  glanceLabel: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  glanceValue: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: spacing.md },
  glanceMeta: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  warningText: { color: colors.warning },
  smartSection: { marginTop: spacing.xl },
  smartList: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scheduleIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleIconOverdue: { backgroundColor: colors.expenseSoft },
  scheduleContent: { flex: 1 },
  scheduleName: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  scheduleMeta: { color: colors.muted, fontSize: 10, marginTop: 3 },
  scheduleRight: { alignItems: 'flex-end' },
  scheduleAmount: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  scheduleAction: { color: colors.primary, fontSize: 11, fontWeight: '800', marginTop: 5 },
  negativeText: { color: colors.expense },
  budgetWatch: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  budgetWatchRow: { marginBottom: spacing.lg },
  budgetWatchTop: { flexDirection: 'row', justifyContent: 'space-between' },
  budgetWatchName: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  budgetWatchValue: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  budgetTrack: {
    height: 7,
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  budgetFill: { height: 7, borderRadius: radius.pill, backgroundColor: colors.primary },
  budgetFillWatch: { backgroundColor: colors.warning },
  budgetFillOver: { backgroundColor: colors.expense },
  budgetPaceMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  budgetPaceStatus: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '800',
  },
  budgetPaceDaily: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '700',
  },
  action: {
    flex: 1,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.65,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  accountList: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  accountCard: {
    width: 180,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 4,
  },
  accountType: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  accountName: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  accountBalance: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
    marginTop: spacing.lg,
  },
  accountEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },
  accountEditText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  recentHeader: {
    marginTop: spacing.xl,
  },
  activityCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 54,
  },
  emptyCompact: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '800',
    marginTop: spacing.md,
  },
  emptyMessage: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
