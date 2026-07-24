import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { formatMoney } from '@/domain/money';
import type { FinanceTransaction } from '@/domain/types';
import { colors, radius, spacing } from '@/theme';

export function TransactionRow({ transaction }: { transaction: FinanceTransaction }) {
  const isIncome = transaction.type === 'income';
  const date = new Intl.DateTimeFormat('en-KE', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(transaction.occurredAt));

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: isIncome ? colors.primarySoft : colors.expenseSoft },
        ]}
      >
        <Ionicons
          name={transaction.categoryIcon as keyof typeof Ionicons.glyphMap}
          size={20}
          color={isIncome ? colors.income : colors.expense}
        />
      </View>
      <View style={styles.details}>
        <Text numberOfLines={1} style={styles.title}>
          {transaction.note || transaction.categoryName}
        </Text>
        <Text style={styles.meta}>
          {transaction.accountName} · {date}
        </Text>
      </View>
      <Text style={[styles.amount, isIncome ? styles.income : styles.expense]}>
        {isIncome ? '+' : '−'}
        {formatMoney(transaction.amountMinor)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  details: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
  },
  amount: {
    fontSize: 14,
    fontWeight: '800',
  },
  income: {
    color: colors.income,
  },
  expense: {
    color: colors.ink,
  },
});
