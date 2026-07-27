import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { emergencyFundMonths, formatMoney } from '@/domain/money';
import { useFinance } from '@/providers/FinanceProvider';
import { colors, radius, spacing } from '@/theme';

export default function GoalsScreen() {
  const { accounts, savingsGoals, monthlySummary, preferences } = useFinance();
  const savingsAccounts = accounts.filter(
    (account) =>
      account.type === 'savings' && account.currency === preferences.mainCurrency,
  );
  const emergencySaved = savingsGoals
    .filter((goal) => goal.goalType === 'emergency')
    .reduce((sum, goal) => sum + goal.savedMinor, 0);
  const coverage = emergencyFundMonths(emergencySaved, monthlySummary.expenseMinor);

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
      <Text style={styles.section}>Savings accounts</Text>
      {savingsAccounts.map((account) => {
        const allocated = savingsGoals
          .filter((goal) => goal.accountId === account.id)
          .reduce((sum, goal) => sum + goal.savedMinor, 0);
        const unallocated = Math.max(0, account.currentBalanceMinor - allocated);
        const overallocated = allocated > account.currentBalanceMinor;
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
                  ? `Short by ${formatMoney(allocated - account.currentBalanceMinor, account.currency)}`
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
      {savingsGoals.map((goal) => {
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
      {!savingsGoals.length ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Give your savings a purpose</Text>
          <Text style={styles.emptyText}>Create an emergency fund or another meaningful target.</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm, marginBottom: spacing.xl },
  headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  coverage: { backgroundColor: colors.dark, borderRadius: radius.lg, padding: spacing.xl },
  coverageLabel: { color: '#B9CEC4', fontSize: 12 },
  coverageValue: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', marginTop: spacing.sm },
  coverageMeta: { color: '#B9CEC4', fontSize: 11, marginTop: spacing.sm },
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
