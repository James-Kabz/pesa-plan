import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formatMoney } from '@/domain/money';
import { useFinance } from '@/providers/FinanceProvider';
import { colors, radius, spacing } from '@/theme';

export default function AccountsScreen() {
  const { accounts, preferences } = useFinance();
  const total = accounts
    .filter((account) => account.currency === preferences.mainCurrency)
    .reduce((sum, account) => sum + account.currentBalanceMinor, 0);

  return (
    <Screen>
      <ScreenHeader
        title="Accounts"
        onBack={() => router.back()}
        actionIcon="add"
        actionLabel="Add account"
        onAction={() => router.push('/account/editor')}
      />

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Combined {preferences.mainCurrency} balance</Text>
        <Text style={styles.totalValue}>{formatMoney(total, preferences.mainCurrency)}</Text>
        <Text style={styles.totalMeta}>{accounts.length} active accounts</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accounts.length < 2 ? 'Add two accounts to transfer' : 'Transfer money'}
          accessibilityState={{ disabled: accounts.length < 2 }}
          disabled={accounts.length < 2}
          style={[styles.transferButton, accounts.length < 2 && styles.disabled]}
          onPress={() => router.push('/transfer/new')}
        >
          <Ionicons name="swap-horizontal" size={18} color={colors.dark} />
          <Text style={styles.transferText}>
            {accounts.length < 2 ? 'Add two accounts to transfer' : 'Transfer money'}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Your accounts</Text>
      <View style={styles.list}>
        {accounts.map((account) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${account.name} account`}
            key={account.id}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            onPress={() =>
              router.push({ pathname: '/account/editor', params: { id: account.id } })
            }
          >
            <View style={[styles.icon, { backgroundColor: `${account.color}18` }]}>
              <Ionicons
                name={account.type === 'mobile_money' ? 'phone-portrait-outline' : 'wallet-outline'}
                size={21}
                color={account.color}
              />
            </View>
            <View style={styles.details}>
              <Text numberOfLines={2} style={styles.name}>{account.name}</Text>
              <Text style={styles.type}>{account.type.replace('_', ' ')}</Text>
            </View>
            <View style={styles.amountWrap}>
              <Text numberOfLines={1} style={styles.amount}>
                {formatMoney(account.currentBalanceMinor, account.currency)}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </View>
          </Pressable>
        ))}
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Add another account" style={styles.addButton} onPress={() => router.push('/account/editor')}>
        <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
        <Text style={styles.addText}>Add another account</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  totalCard: {
    backgroundColor: colors.dark,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  totalLabel: {
    color: '#B9CEC4',
    fontSize: 12,
  },
  totalValue: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  totalMeta: {
    color: '#B9CEC4',
    fontSize: 12,
    marginTop: spacing.md,
  },
  transferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.lime,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.xl,
  },
  transferText: {
    color: colors.dark,
    fontSize: 13,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.45,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pressed: { opacity: 0.65 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  details: { flex: 1, minWidth: 0 },
  name: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  type: {
    color: colors.muted,
    fontSize: 11,
    textTransform: 'capitalize',
    marginTop: 3,
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    maxWidth: '48%',
  },
  amount: {
    flexShrink: 1,
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    marginTop: spacing.xl,
  },
  addText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
