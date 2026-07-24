import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { TransactionRow } from '@/components/TransactionRow';
import { getTimeGreeting } from '@/domain/greeting';
import { formatMoney } from '@/domain/money';
import { useFinance } from '@/providers/FinanceProvider';
import { colors, radius, spacing } from '@/theme';

export default function DashboardScreen() {
  const { accounts, monthlySummary, transactions } = useFinance();
  const [amountsVisible, setAmountsVisible] = useState(true);
  const [greeting, setGreeting] = useState(() => getTimeGreeting());
  const privateValue = (value: string) => (amountsVisible ? value : '••••••');
  const totalBalance = accounts
    .filter((account) => account.currency === 'KES')
    .reduce((sum, account) => sum + account.currentBalanceMinor, 0);
  const month = new Intl.DateTimeFormat('en-KE', { month: 'long', year: 'numeric' }).format(
    new Date(),
  );

  useEffect(() => {
    const timer = setInterval(() => setGreeting(getTimeGreeting()), 60_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>YOUR MONEY</Text>
          <Text style={styles.greeting}>{greeting}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Open privacy and data settings" style={styles.profile} onPress={() => router.push('/settings')}>
          <Ionicons name="person-outline" size={19} color={colors.primary} />
        </Pressable>
      </View>

      <LinearGradient
        colors={[colors.primary, colors.dark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.balanceCard}
      >
        <View style={styles.balanceTop}>
          <Text style={styles.balanceLabel}>KES account balance</Text>
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
          accessibilityLabel={amountsVisible ? formatMoney(totalBalance) : 'Balance hidden'}
          style={styles.balance}
        >
          {privateValue(formatMoney(totalBalance))}
        </Text>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.cardMeta}>Income</Text>
            <Text style={styles.cardValue}>
              {privateValue(`+${formatMoney(monthlySummary.incomeMinor)}`)}
            </Text>
          </View>
          <View style={styles.divider} />
          <View>
            <Text style={styles.cardMeta}>Spent</Text>
            <Text style={styles.cardValue}>
              {privateValue(`−${formatMoney(monthlySummary.expenseMinor)}`)}
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
        <QuickAction icon="wallet-outline" label="Accounts" onPress={() => router.push('/accounts')} />
      </View>

      <SectionHeader title="Accounts" action={`${accounts.length} total`} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.accountList}
      >
        {accounts.map((account) => (
          <View key={account.id} style={[styles.accountCard, { borderTopColor: account.color }]}>
            <Text style={styles.accountType}>{account.type.replace('_', ' ')}</Text>
            <Text style={styles.accountName}>{account.name}</Text>
            <Text style={styles.accountBalance}>
              {privateValue(formatMoney(account.currentBalanceMinor, account.currency))}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.recentHeader}>
        <SectionHeader title="Recent activity" action={transactions.length ? 'Latest' : undefined} />
      </View>
      <View style={styles.activityCard}>
        {transactions.length ? (
          transactions.slice(0, 5).map((transaction, index) => (
            <View key={transaction.id}>
              <TransactionRow transaction={transaction} amountsVisible={amountsVisible} />
              {index < Math.min(transactions.length, 5) - 1 ? (
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
  profile: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginVertical: spacing.xl,
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
