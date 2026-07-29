import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  findNodeHandle,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/EmptyState';
import { TransactionRow } from '@/components/TransactionRow';
import { formatMoneyInput } from '@/domain/money';
import {
  activeTransactionFilterCount,
  DEFAULT_TRANSACTION_FILTERS,
  parseOptionalSearchAmount,
  searchTransactions,
  type TransactionDateRange,
  type TransactionSearchFilters,
  type TransactionSort,
} from '@/domain/transactionSearch';
import { useFinance } from '@/providers/FinanceProvider';
import { colors, radius, spacing } from '@/theme';

export default function TransactionsScreen() {
  const { accounts, transactions, removeTransaction } = useFinance();
  const [filters, setFilters] = useState<TransactionSearchFilters>(
    DEFAULT_TRANSACTION_FILTERS,
  );
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [minimumText, setMinimumText] = useState('');
  const [maximumText, setMaximumText] = useState('');
  const filterTitleRef = useRef<Text>(null);
  const activeFilterCount = activeTransactionFilterCount(filters);
  const visibleTransactions = useMemo(
    () => searchTransactions(transactions, filters),
    [filters, transactions],
  );
  const categories = useMemo(
    () =>
      [
        ...new Map(
          transactions
            .filter((transaction) => transaction.type !== 'transfer')
            .map((transaction) => [
              transaction.categoryId,
              {
                id: transaction.categoryId,
                name: transaction.categoryName,
              },
            ]),
        ).values(),
      ].sort((a, b) => a.name.localeCompare(b.name)),
    [transactions],
  );

  function updateFilters(next: Partial<TransactionSearchFilters>) {
    setFilters((current) => ({ ...current, ...next }));
  }

  function clearFilters() {
    setFilters({
      ...DEFAULT_TRANSACTION_FILTERS,
      query: filters.query,
    });
    setMinimumText('');
    setMaximumText('');
  }

  function updateAmount(kind: 'minimum' | 'maximum', value: string) {
    const formatted = formatMoneyInput(value);
    if (kind === 'minimum') setMinimumText(formatted);
    else setMaximumText(formatted);
    updateFilters({
      [kind === 'minimum' ? 'minAmountMinor' : 'maxAmountMinor']:
        parseOptionalSearchAmount(formatted),
    });
  }

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
          <Text accessibilityRole="header" style={styles.title}>Activity</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add transaction"
          style={styles.add}
          onPress={() => router.push({ pathname: '/transaction/new', params: { type: 'expense' } })}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={styles.searchControls}>
        <View style={styles.search}>
          <Ionicons name="search-outline" size={19} color={colors.muted} />
          <TextInput
            accessibilityLabel="Search all activity"
            value={filters.query}
            onChangeText={(query) => updateFilters({ query })}
            placeholder="Description, account, category…"
            placeholderTextColor="#98A19B"
            returnKeyType="search"
            style={styles.searchInput}
          />
          {filters.query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={8}
              onPress={() => updateFilters({ query: '' })}
            >
              <Ionicons name="close-circle" size={19} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open search filters${activeFilterCount ? `, ${activeFilterCount} active` : ''}`}
          onPress={() => setFilterModalVisible(true)}
          style={[
            styles.filterButton,
            activeFilterCount > 0 && styles.filterButtonActive,
          ]}
        >
          <Ionicons
            name="options-outline"
            size={21}
            color={activeFilterCount ? '#FFFFFF' : colors.primary}
          />
          {activeFilterCount ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
      <View style={styles.filters}>
        {(['all', 'expense', 'income', 'transfer'] as const).map((option) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Show ${option} activity`}
            accessibilityState={{ selected: filters.type === option }}
            key={option}
            onPress={() => updateFilters({ type: option })}
            style={[styles.filter, filters.type === option && styles.filterSelected]}
          >
            <Text
              style={[
                styles.filterText,
                filters.type === option && styles.filterTextSelected,
              ]}
            >
              {option[0].toUpperCase() + option.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {transactions.length ? (
        <>
          <View style={styles.resultSummary}>
            <View>
              <Text style={styles.resultCount}>
                {visibleTransactions.length === transactions.length
                  ? `${transactions.length} records`
                  : `${visibleTransactions.length} of ${transactions.length} records`}
              </Text>
              <Text style={styles.editHint}>
                Tap income or expenses to edit · hold to delete
              </Text>
            </View>
            {activeFilterCount ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear all activity filters"
                onPress={clearFilters}
              >
                <Text style={styles.clearFilters}>Clear filters</Text>
              </Pressable>
            ) : null}
          </View>
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
                {index < visibleTransactions.length - 1 ? (
                  <View style={styles.divider} />
                ) : null}
              </View>
            ))}
            {!visibleTransactions.length ? (
              <View style={styles.noResults}>
                <Ionicons name="search-outline" size={28} color={colors.primary} />
                <Text style={styles.noResultsTitle}>No matching activity</Text>
                <Text style={styles.noResultsText}>
                  Try fewer words or clear one of the filters.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Reset activity search and filters"
                  onPress={() => {
                    setFilters(DEFAULT_TRANSACTION_FILTERS);
                    setMinimumText('');
                    setMaximumText('');
                  }}
                  style={styles.resetInline}
                >
                  <Text style={styles.resetInlineText}>Reset search</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </>
      ) : (
        <EmptyState
          icon="swap-vertical-outline"
          title="No activity yet"
          message="Record income and expenses to build a clear picture of your cash flow."
          actionLabel="Add first transaction"
          onAction={() =>
            router.push({
              pathname: '/transaction/new',
              params: { type: 'expense' },
            })
          }
        />
      )}

      <Modal
        animationType="slide"
        onShow={() => {
          const node = findNodeHandle(filterTitleRef.current);
          if (node) AccessibilityInfo.setAccessibilityFocus(node);
        }}
        onRequestClose={() => setFilterModalVisible(false)}
        transparent
        visible={filterModalVisible}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View
            accessibilityViewIsModal
            accessibilityLabel="Activity filters"
            style={styles.filterSheet}
          >
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetEyebrow}>NARROW THE RESULTS</Text>
                <Text
                  accessibilityRole="header"
                  ref={filterTitleRef}
                  style={styles.sheetTitle}
                >
                  Filters
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close activity filters"
                onPress={() => setFilterModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={22} color={colors.ink} />
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetContent}
            >
              <FilterSection title="Date">
                <ChoiceGroup>
                  {DATE_OPTIONS.map((option) => (
                    <ChoiceChip
                      key={option.value}
                      label={option.label}
                      selected={filters.dateRange === option.value}
                      onPress={() => updateFilters({ dateRange: option.value })}
                    />
                  ))}
                </ChoiceGroup>
              </FilterSection>

              <FilterSection title="Account">
                <ChoiceGroup>
                  <ChoiceChip
                    label="Any account"
                    selected={filters.accountId === null}
                    onPress={() =>
                      updateFilters({ accountId: null, accountName: null })
                    }
                  />
                  {accounts.map((account) => (
                    <ChoiceChip
                      key={account.id}
                      label={account.name}
                      selected={filters.accountId === account.id}
                      onPress={() =>
                        updateFilters({
                          accountId: account.id,
                          accountName: account.name,
                        })
                      }
                    />
                  ))}
                </ChoiceGroup>
              </FilterSection>

              <FilterSection title="Category">
                <ChoiceGroup>
                  <ChoiceChip
                    label="Any category"
                    selected={filters.categoryId === null}
                    onPress={() => updateFilters({ categoryId: null })}
                  />
                  {categories.map((category) => (
                    <ChoiceChip
                      key={category.id}
                      label={category.name}
                      selected={filters.categoryId === category.id}
                      onPress={() =>
                        updateFilters({ categoryId: category.id })
                      }
                    />
                  ))}
                </ChoiceGroup>
                {!categories.length ? (
                  <Text style={styles.filterHint}>
                    Categories appear after you record activity.
                  </Text>
                ) : null}
              </FilterSection>

              <FilterSection title="Amount">
                <View style={styles.amountFields}>
                  <View style={styles.amountField}>
                    <Text style={styles.amountLabel}>Minimum</Text>
                    <TextInput
                      accessibilityLabel="Minimum transaction amount"
                      keyboardType="decimal-pad"
                      onChangeText={(value) => updateAmount('minimum', value)}
                      placeholder="0.00"
                      placeholderTextColor="#98A19B"
                      style={styles.amountInput}
                      value={minimumText}
                    />
                  </View>
                  <View style={styles.amountField}>
                    <Text style={styles.amountLabel}>Maximum</Text>
                    <TextInput
                      accessibilityLabel="Maximum transaction amount"
                      keyboardType="decimal-pad"
                      onChangeText={(value) => updateAmount('maximum', value)}
                      placeholder="No limit"
                      placeholderTextColor="#98A19B"
                      style={styles.amountInput}
                      value={maximumText}
                    />
                  </View>
                </View>
                <Text style={styles.filterHint}>
                  Amounts use each transaction’s recorded currency; no exchange
                  rate is assumed.
                </Text>
              </FilterSection>

              <FilterSection title="Sort">
                <ChoiceGroup>
                  {SORT_OPTIONS.map((option) => (
                    <ChoiceChip
                      key={option.value}
                      label={option.label}
                      selected={filters.sort === option.value}
                      onPress={() => updateFilters({ sort: option.value })}
                    />
                  ))}
                </ChoiceGroup>
              </FilterSection>
            </ScrollView>

            <View style={styles.sheetActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Reset activity filters"
                onPress={clearFilters}
                style={styles.resetButton}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Show ${visibleTransactions.length} matching records`}
                onPress={() => setFilterModalVisible(false)}
                style={styles.showButton}
              >
                <Text style={styles.showButtonText}>
                  Show {visibleTransactions.length}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const DATE_OPTIONS: Array<{
  value: TransactionDateRange;
  label: string;
}> = [
  { value: 'all', label: 'Any time' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'this_year', label: 'This year' },
];

const SORT_OPTIONS: Array<{ value: TransactionSort; label: string }> = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'highest', label: 'Highest amount' },
];

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.filterSection}>
      <Text style={styles.filterSectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ChoiceGroup({ children }: { children: React.ReactNode }) {
  return <View style={styles.choiceGroup}>{children}</View>;
}

function ChoiceChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceSelected]}
    >
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
        {label}
      </Text>
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
  searchControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.ink,
    fontSize: 14,
    paddingVertical: spacing.md,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.lime,
    borderWidth: 2,
    borderColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: colors.dark,
    fontSize: 10,
    fontWeight: '900',
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  resultSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  resultCount: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  editHint: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 3,
  },
  clearFilters: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
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
    textAlign: 'center',
  },
  resetInline: {
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  resetInlineText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 45, 35, 0.45)',
  },
  filterSheet: {
    maxHeight: '90%',
    backgroundColor: colors.canvas,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  sheetEyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  sheetTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  filterSection: {
    marginTop: spacing.lg,
  },
  filterSectionTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  choiceGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  choice: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  choiceSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  choiceText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  choiceTextSelected: {
    color: '#FFFFFF',
  },
  amountFields: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  amountField: {
    flex: 1,
  },
  amountLabel: {
    color: colors.muted,
    fontSize: 11,
    marginBottom: spacing.xs,
  },
  amountInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.ink,
    fontSize: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  filterHint: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: spacing.sm,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  resetButton: {
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  resetButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  showButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    padding: spacing.lg,
  },
  showButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
