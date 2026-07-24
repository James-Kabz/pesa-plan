import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMoney } from '@/domain/money';
import type { FinanceTransaction } from '@/domain/types';
import { colors, radius, spacing } from '@/theme';

export function TransactionRow({
  transaction,
  onPress,
  onLongPress,
}: {
  transaction: FinanceTransaction;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const isIncome = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';
  const date = new Intl.DateTimeFormat('en-KE', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(transaction.occurredAt));

  return (
    <Pressable
      accessibilityRole={onPress || onLongPress ? 'button' : undefined}
      accessibilityLabel={`${transaction.note || transaction.categoryName}, ${transaction.accountName}, ${date}, ${isTransfer ? '' : isIncome ? 'income ' : 'expense '}${formatMoney(transaction.amountMinor, transaction.currency)}`}
      accessibilityHint={onLongPress ? 'Long press to delete' : undefined}
      style={({ pressed }) => [styles.row, pressed && onLongPress ? styles.pressed : undefined]}
      onLongPress={onLongPress}
      onPress={onPress}
      delayLongPress={450}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor:
              isIncome || isTransfer ? colors.primarySoft : colors.expenseSoft,
          },
        ]}
      >
        <Ionicons
          name={transaction.categoryIcon as keyof typeof Ionicons.glyphMap}
          size={20}
          color={isTransfer ? colors.primary : isIncome ? colors.income : colors.expense}
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
      <Text
        style={[
          styles.amount,
          isTransfer ? styles.transfer : isIncome ? styles.income : styles.expense,
        ]}
      >
        {isTransfer ? '' : isIncome ? '+' : '−'}
        {formatMoney(transaction.amountMinor, transaction.currency)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  pressed: {
    opacity: 0.6,
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
  transfer: {
    color: colors.primary,
  },
});
