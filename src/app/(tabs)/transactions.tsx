import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/EmptyState';
import { TransactionRow } from '@/components/TransactionRow';
import { useFinance } from '@/providers/FinanceProvider';
import { colors, radius, spacing } from '@/theme';

export default function TransactionsScreen() {
  const { transactions, removeTransaction } = useFinance();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const visibleTransactions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return transactions.filter((transaction) => {
      const matchesType = filter === 'all' || transaction.type === filter;
      const matchesQuery =
        !normalized ||
        transaction.note?.toLowerCase().includes(normalized) ||
        transaction.categoryName.toLowerCase().includes(normalized) ||
        transaction.accountName.toLowerCase().includes(normalized);
      return matchesType && matchesQuery;
    });
  }, [filter, query, transactions]);

  function confirmDelete(id: string) {
    Alert.alert('Delete transaction?', 'This permanently removes it and recalculates your balance.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void removeTransaction(id),
      },
    ]);
  }

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

      <View style={styles.search}>
        <Ionicons name="search-outline" size={19} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search activity"
          placeholderTextColor="#98A19B"
          style={styles.searchInput}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={19} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.filters}>
        {(['all', 'expense', 'income', 'transfer'] as const).map((option) => (
          <Pressable
            key={option}
            onPress={() => setFilter(option)}
            style={[styles.filter, filter === option && styles.filterSelected]}
          >
            <Text style={[styles.filterText, filter === option && styles.filterTextSelected]}>
              {option[0].toUpperCase() + option.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {transactions.length ? (
        <View style={styles.list}>
          {visibleTransactions.map((transaction, index) => (
            <View key={transaction.id}>
              <TransactionRow
                transaction={transaction}
                onPress={
                  transaction.type === 'transfer'
                    ? undefined
                    : () =>
                        router.push({
                          pathname: '/transaction/new',
                          params: { id: transaction.id },
                        })
                }
                onLongPress={() => confirmDelete(transaction.id)}
              />
              {index < visibleTransactions.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))}
          {!visibleTransactions.length ? (
            <View style={styles.noResults}>
              <Text style={styles.noResultsTitle}>No matching activity</Text>
              <Text style={styles.noResultsText}>Try a different search or filter.</Text>
            </View>
          ) : null}
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
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.ink,
    fontSize: 14,
    paddingVertical: spacing.md,
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  filter: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  filterTextSelected: {
    color: '#FFFFFF',
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
  noResults: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  noResultsTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  noResultsText: {
    color: colors.muted,
    fontSize: 12,
    marginTop: spacing.xs,
  },
});
