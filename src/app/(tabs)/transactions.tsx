import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/EmptyState';
import { TransactionRow } from '@/components/TransactionRow';
import { useFinance } from '@/providers/FinanceProvider';
import { colors, radius, spacing } from '@/theme';

export default function TransactionsScreen() {
  const { transactions } = useFinance();

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>MONEY MOVEMENT</Text>
          <Text style={styles.title}>Activity</Text>
        </View>
        <Pressable
          style={styles.add}
          onPress={() => router.push({ pathname: '/transaction/new', params: { type: 'expense' } })}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      {transactions.length ? (
        <View style={styles.list}>
          {transactions.map((transaction, index) => (
            <View key={transaction.id}>
              <TransactionRow transaction={transaction} />
              {index < transactions.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))}
        </View>
      ) : (
        <EmptyState
          icon="swap-vertical-outline"
          title="No activity yet"
          message="Record income and expenses to build a clear picture of your cash flow."
        />
      )}
    </Screen>
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
    letterSpacing: 1.5,
  },
  title: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  add: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 54,
  },
});
