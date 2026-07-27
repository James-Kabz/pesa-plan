import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { emergencyFundMonths, formatMoney } from '@/domain/money';
import {
  getSavingsGuidance,
  type SavingsGuidance,
} from '@/domain/savingsGuidance';
import { useFinance } from '@/providers/FinanceProvider';
import { colors, radius, spacing } from '@/theme';

export default function GoalsScreen() {
  const { accounts, savingsGoals, monthlySummary, preferences } = useFinance();
  const savingsAccounts = accounts.filter(
    (account) =>
      account.type === 'savings' && account.currency === preferences.mainCurrency,
  );
  const savingsAccountIds = new Set(
    savingsAccounts.map((account) => account.id),
  );
  const mainCurrencyGoals = savingsGoals.filter(
    (goal) => !goal.accountId || savingsAccountIds.has(goal.accountId),
  );
  const guidance = getSavingsGuidance(
    accounts,
    savingsGoals,
    preferences.mainCurrency,
  );
  const emergencySaved = mainCurrencyGoals
    .filter((goal) => goal.goalType === 'emergency')
    .reduce((sum, goal) => sum + goal.savedMinor, 0);
  const coverage = emergencyFundMonths(emergencySaved, monthlySummary.expenseMinor);

  function openGuidance(item: SavingsGuidance) {
    switch (item.action) {
      case 'allocate_goal':
      case 'link_goal':
        router.push({
          pathname: '/goal/editor',
          params: {
            id: item.goalId,
            suggestedMinor:
              item.action === 'allocate_goal'
                ? item.suggestedAmountMinor
                : undefined,
          },
        });
        break;
      case 'create_goal':
        router.push({
          pathname: '/goal/editor',
          params: { accountId: item.accountId },
        });
        break;
      case 'fund_goal':
      case 'restore_balance':
        router.push({
          pathname: '/transfer/new',
          params: { toAccountId: item.accountId },
        });
        break;
      case 'create_account':
        router.push('/account/editor');
        break;
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Savings goals</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Add savings goal" style={styles.headerButton} onPress={() => router.push('/goal/editor')}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </Pressable>
      </View>
      <View style={styles.coverage}>
        <Text style={styles.coverageLabel}>Emergency coverage estimate</Text>
        <Text style={styles.coverageValue}>{coverage.toFixed(1)} months</Text>
        <Text style={styles.coverageMeta}>Based on this month’s recorded spending</Text>
      </View>
      <View
        accessibilityRole="summary"
        accessibilityLabel={`${guidance.title}. ${guidance.reason}`}
        style={[
          styles.guidance,
          guidance.action === 'restore_balance' &&
            styles.guidanceWarning,
        ]}
      >
        <View
          style={[
            styles.guidanceIcon,
            guidance.action === 'restore_balance' &&
              styles.guidanceIconWarning,
          ]}
        >
          <Ionicons
            name={
              guidance.action === 'restore_balance'
                ? 'alert-circle-outline'
                : guidance.action === 'all_set'
                  ? 'checkmark-circle-outline'
                  : 'sparkles-outline'
            }
            size={22}
            color={
              guidance.action === 'restore_balance'
                ? colors.warning
                : colors.primary
            }
          />
        </View>
        <View style={styles.guidanceContent}>
          <Text style={styles.guidanceLabel}>YOUR NEXT SAVINGS STEP</Text>
          <Text style={styles.guidanceTitle}>{guidance.title}</Text>
          <Text style={styles.guidanceReason}>{guidance.reason}</Text>
          {guidance.suggestedAmountMinor ? (
            <Text style={styles.guidanceAmount}>
              {formatMoney(
                guidance.suggestedAmountMinor,
                preferences.mainCurrency,
              )}
            </Text>
          ) : null}
          {guidance.action !== 'all_set' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={getGuidanceActionLabel(guidance)}
              onPress={() => openGuidance(guidance)}
              style={styles.guidanceAction}
            >
              <Text style={styles.guidanceActionText}>
                {getGuidanceActionLabel(guidance)}
              </Text>
              <Ionicons
                name="arrow-forward"
                size={16}
                color={colors.primary}
              />
            </Pressable>
          ) : null}
        </View>
      </View>
      <Text style={styles.section}>Savings accounts</Text>
      {savingsAccounts.map((account) => {
        const allocation = guidance.accounts.find(
          (item) => item.accountId === account.id,
        );
        const allocated = allocation?.allocatedMinor ?? 0;
        const unallocated = allocation?.unallocatedMinor ?? 0;
        const shortfall = allocation?.shortfallMinor ?? 0;
        const overallocated = shortfall > 0;
        return (
          <View key={account.id} style={styles.accountCard}>
            <View style={styles.accountTop}>
              <View>
                <Text style={styles.accountName}>{account.name}</Text>
                <Text style={styles.accountMeta}>Actual account balance</Text>
              </View>
              <Text style={styles.accountTotal}>
                {formatMoney(account.currentBalanceMinor, account.currency)}
              </Text>
            </View>
            <View style={styles.allocationRow}>
              <Text style={styles.allocationLabel}>
                Allocated {formatMoney(allocated, account.currency)}
              </Text>
              <Text style={overallocated ? styles.overallocated : styles.unallocated}>
                {overallocated
                  ? `Short by ${formatMoney(shortfall, account.currency)}`
                  : `Available ${formatMoney(unallocated, account.currency)}`}
              </Text>
            </View>
          </View>
        );
      })}
      {!savingsAccounts.length ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create a savings account"
          style={styles.emptyAccount}
          onPress={() => router.push('/account/editor')}
        >
          <Ionicons name="wallet-outline" size={24} color={colors.primary} />
          <View style={styles.emptyAccountText}>
            <Text style={styles.emptyTitle}>Add a savings account</Text>
            <Text style={styles.emptyText}>
              Transfer money into it, then allocate that real balance to your goals.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>
      ) : null}
      <Text style={styles.section}>Goals</Text>
      {mainCurrencyGoals.map((goal) => {
        const progress = Math.min(1, goal.savedMinor / goal.targetMinor);
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${goal.name} savings goal`}
            key={goal.id}
            style={styles.card}
            onPress={() => router.push({ pathname: '/goal/editor', params: { id: goal.id } })}
          >
            <View style={[styles.icon, { backgroundColor: `${goal.color}18` }]}>
              <Ionicons name={goal.goalType === 'emergency' ? 'shield-checkmark-outline' : 'sparkles-outline'} size={21} color={goal.color} />
            </View>
            <View style={styles.details}>
              <View style={styles.top}><Text style={styles.name}>{goal.name}</Text><Text style={styles.percent}>{Math.round(progress * 100)}%</Text></View>
              <Text style={styles.meta}>
                {formatMoney(goal.savedMinor, preferences.mainCurrency)} of{' '}
                {formatMoney(goal.targetMinor, preferences.mainCurrency)}
              </Text>
              <Text style={[styles.accountLink, !goal.accountId && styles.accountLinkWarning]}>
                {goal.accountName ?? 'Choose a savings account'}
              </Text>
              <View style={styles.track}><View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: goal.color }]} /></View>
            </View>
          </Pressable>
        );
      })}
      {!mainCurrencyGoals.length ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Give your savings a purpose</Text>
          <Text style={styles.emptyText}>Create an emergency fund or another meaningful target.</Text>
        </View>
      ) : null}
    </Screen>
  );
}

function getGuidanceActionLabel(guidance: SavingsGuidance): string {
  switch (guidance.action) {
    case 'allocate_goal':
      return `Allocate to ${guidance.goalName}`;
    case 'create_goal':
      return 'Create a goal';
    case 'link_goal':
      return `Link ${guidance.goalName}`;
    case 'fund_goal':
      return 'Transfer to savings';
    case 'restore_balance':
      return `Review ${guidance.accountName}`;
    case 'create_account':
      return 'Create a savings account';
    default:
      return 'Open savings';
  }
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm, marginBottom: spacing.xl },
  headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  coverage: { backgroundColor: colors.dark, borderRadius: radius.lg, padding: spacing.xl },
  coverageLabel: { color: '#B9CEC4', fontSize: 12 },
  coverageValue: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', marginTop: spacing.sm },
  coverageMeta: { color: '#B9CEC4', fontSize: 11, marginTop: spacing.sm },
  guidance: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#BFD8CA',
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  guidanceWarning: {
    backgroundColor: '#FFFCF5',
    borderColor: '#E8D2A8',
  },
  guidanceIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guidanceIconWarning: { backgroundColor: '#F8EED8' },
  guidanceContent: { flex: 1 },
  guidanceLabel: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  guidanceTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 3,
  },
  guidanceReason: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 3,
  },
  guidanceAmount: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  guidanceAction: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  guidanceActionText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  section: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: spacing.xl, marginBottom: spacing.md },
  accountCard: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.sm },
  accountTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  accountName: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  accountMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  accountTotal: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  allocationRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.md, paddingTop: spacing.md },
  allocationLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  unallocated: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  overallocated: { color: colors.expense, fontSize: 11, fontWeight: '800' },
  emptyAccount: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  emptyAccountText: { flex: 1, marginHorizontal: spacing.md },
  card: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },
  icon: { width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  details: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  percent: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  meta: { color: colors.muted, fontSize: 11, marginTop: 3 },
  accountLink: { color: colors.primary, fontSize: 10, fontWeight: '700', marginTop: 3 },
  accountLinkWarning: { color: colors.expense },
  track: { height: 7, backgroundColor: colors.border, borderRadius: radius.pill, overflow: 'hidden', marginTop: spacing.sm },
  fill: { height: 7, borderRadius: radius.pill },
  empty: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.xl },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  emptyText: { color: colors.muted, fontSize: 13, marginTop: spacing.sm, textAlign: 'center' },
});
