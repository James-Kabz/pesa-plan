import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getFastEntryDefaults,
  getRecentAmounts,
  getRecentTemplates,
  orderAccountsForEntry,
  orderCategoriesForEntry,
} from '@/domain/fastEntry';
import {
  normalizeDescription,
  suggestCategory,
} from '@/domain/categorySuggestion';
import {
  formatMoney,
  formatMoneyInput,
  parseMoneyInput,
} from '@/domain/money';
import type { FinanceTransaction, TransactionType } from '@/domain/types';
import { useFinance } from '@/providers/FinanceProvider';
import { colors, radius, spacing } from '@/theme';

export default function NewTransactionScreen() {
  const params = useLocalSearchParams<{ type?: string; id?: string }>();
  const { accounts, categories, transactions, addTransaction } = useFinance();
  const existing = transactions.find((transaction) => transaction.id === params.id);
  const initialType: TransactionType =
    existing?.type === 'income' || params.type === 'income' ? 'income' : 'expense';
  const initialDefaults = getFastEntryDefaults(
    transactions,
    accounts,
    categories,
    initialType,
  );
  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState(
    existing ? formatMoneyInput(String(existing.amountMinor / 100)) : '',
  );
  const [note, setNote] = useState(existing?.note ?? '');
  const [occurredOn, setOccurredOn] = useState(() =>
    toLocalDateValue(existing?.occurredAt ?? new Date().toISOString()),
  );
  const [accountId, setAccountId] = useState(existing?.accountId ?? initialDefaults.accountId);
  const relevantCategories = useMemo(
    () => orderCategoriesForEntry(categories, transactions, type),
    [categories, transactions, type],
  );
  const orderedAccounts = useMemo(
    () => orderAccountsForEntry(accounts, transactions, type),
    [accounts, transactions, type],
  );
  const [categoryId, setCategoryId] = useState(
    existing?.categoryId ?? initialDefaults.categoryId,
  );
  const [saving, setSaving] = useState(false);
  const [dismissedSuggestionKey, setDismissedSuggestionKey] = useState('');
  const selectedAccount = accounts.find((account) => account.id === accountId);
  const templates = useMemo(
    () => getRecentTemplates(transactions, type),
    [transactions, type],
  );
  const recentAmounts = useMemo(
    () => getRecentAmounts(transactions, type, accountId),
    [accountId, transactions, type],
  );
  const amountInputRef = useRef<TextInput>(null);
  const categorySuggestion = useMemo(
    () => suggestCategory(note, transactions, categories, type),
    [categories, note, transactions, type],
  );
  const normalizedNote = normalizeDescription(note);
  const visibleSuggestion =
    categorySuggestion &&
    categorySuggestion.categoryId !== categoryId &&
    dismissedSuggestionKey !== normalizedNote
      ? categorySuggestion
      : null;

  function changeType(nextType: TransactionType) {
    const defaults = getFastEntryDefaults(transactions, accounts, categories, nextType);
    setType(nextType);
    setAccountId(defaults.accountId);
    setCategoryId(defaults.categoryId);
    setDismissedSuggestionKey('');
  }

  function applyTemplate(template: FinanceTransaction) {
    setType(template.type as TransactionType);
    setAccountId(template.accountId);
    setCategoryId(template.categoryId);
    setAmount(formatMoneyInput(String(template.amountMinor / 100)));
    setNote(template.note ?? '');
    setDismissedSuggestionKey('');
    amountInputRef.current?.focus();
  }

  function applyCategorySuggestion() {
    if (!visibleSuggestion) return;
    setCategoryId(visibleSuggestion.categoryId);
    void Haptics.selectionAsync();
  }

  async function save(addAnother = false) {
    const amountMinor = parseMoneyInput(amount);
    if (!amountMinor) {
      Alert.alert('Check the amount', 'Enter an amount greater than zero with up to two decimals.');
      return;
    }
    if (!accountId || !categoryId) {
      Alert.alert('Missing details', 'Choose an account and category.');
      return;
    }
    const occurredAt = resolveOccurredAt(occurredOn, existing?.occurredAt);
    if (!occurredAt) {
      Alert.alert('Check the date', 'Enter a real date in YYYY-MM-DD format.');
      return;
    }

    try {
      setSaving(true);
      await addTransaction({
        id: existing?.id,
        accountId,
        categoryId,
        type,
        amountMinor,
        note,
        occurredAt,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (addAnother && !existing) {
        setAmount('');
        setNote('');
        setSaving(false);
        AccessibilityInfo.announceForAccessibility(
          'Transaction saved. Ready for another.',
        );
        requestAnimationFrame(() => amountInputRef.current?.focus());
      } else {
        router.back();
      }
    } catch {
      Alert.alert('Could not save', 'Your transaction was not saved. Please try again.');
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close transaction editor" style={styles.close} onPress={() => router.back()}>
            <Ionicons name="close" size={22} color={colors.ink} />
          </Pressable>
          <Text accessibilityRole="header" style={styles.headerTitle}>{existing ? 'Edit transaction' : 'New transaction'}</Text>
          <View style={styles.close} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.segment}>
            {(['expense', 'income'] as const).map((option) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${option} transaction type`}
                accessibilityState={{ selected: type === option }}
                key={option}
                onPress={() => changeType(option)}
                style={[styles.segmentOption, type === option && styles.segmentSelected]}
              >
                <Text style={[styles.segmentText, type === option && styles.segmentTextSelected]}>
                  {option === 'expense' ? 'Expense' : 'Income'}
                </Text>
              </Pressable>
            ))}
          </View>

          {!existing && templates.length ? (
            <>
              <View style={styles.sectionHeading}>
                <Text style={styles.label}>Use again</Text>
                <Text style={styles.sectionHint}>Tap to prefill</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.templates}>
                  {templates.map((template) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Use ${template.note || template.categoryName}, ${formatMoney(template.amountMinor, template.currency)} again`}
                      key={template.id}
                      onPress={() => applyTemplate(template)}
                      style={({ pressed }) => [
                        styles.templateCard,
                        pressed && styles.savePressed,
                      ]}
                    >
                      <View style={styles.templateTop}>
                        <View style={styles.templateIcon}>
                          <Ionicons
                            name={template.categoryIcon as keyof typeof Ionicons.glyphMap}
                            size={18}
                            color={colors.primary}
                          />
                        </View>
                        <Text style={styles.templateAmount}>
                          {formatMoney(template.amountMinor, template.currency)}
                        </Text>
                      </View>
                      <Text numberOfLines={1} style={styles.templateTitle}>
                        {template.note || template.categoryName}
                      </Text>
                      <Text numberOfLines={1} style={styles.templateMeta}>
                        {template.accountName} · {template.categoryName}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </>
          ) : null}

          <Text style={styles.amountLabel}>Amount</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currency}>{selectedAccount?.currency ?? 'KES'}</Text>
            <TextInput
              ref={amountInputRef}
              accessibilityLabel="Transaction amount"
              autoFocus
              value={amount}
              onChangeText={(value) => setAmount(formatMoneyInput(value))}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#A6AFA9"
              style={styles.amountInput}
            />
          </View>
          {!existing && recentAmounts.length ? (
            <View style={styles.amountShortcuts}>
              {recentAmounts.map((amountMinor) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Use recent amount ${formatMoney(
                    amountMinor,
                    selectedAccount?.currency,
                  )}`}
                  key={amountMinor}
                  onPress={() =>
                    setAmount(formatMoneyInput(String(amountMinor / 100)))
                  }
                  style={styles.amountShortcut}
                >
                  <Text style={styles.amountShortcutText}>
                    {formatMoney(amountMinor, selectedAccount?.currency)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <Text style={styles.label}>Transaction date</Text>
          <TextInput
            accessibilityLabel="Transaction date"
            value={occurredOn}
            onChangeText={(value) =>
              setOccurredOn(
                value.replace(/[^\d-]/g, '').slice(0, 10),
              )
            }
            keyboardType="numbers-and-punctuation"
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#98A19B"
            style={styles.dateInput}
          />
          <Text style={styles.dateHint}>
            Use YYYY-MM-DD. Editing the date moves this entry to that month.
          </Text>

          <Text style={styles.label}>Account</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chips}>
              {orderedAccounts.map((account) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${account.name} account`}
                  accessibilityState={{ selected: accountId === account.id }}
                  key={account.id}
                  onPress={() => setAccountId(account.id)}
                  style={[styles.chip, accountId === account.id && styles.chipSelected]}
                >
                  <Ionicons
                    name="wallet-outline"
                    size={16}
                    color={accountId === account.id ? '#FFFFFF' : colors.primary}
                  />
                  <Text
                    style={[styles.chipText, accountId === account.id && styles.chipTextSelected]}
                  >
                    {account.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            accessibilityLabel="Transaction note"
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Naivas, rent, fuel"
            placeholderTextColor="#98A19B"
            style={styles.note}
          />

          {visibleSuggestion ? (
            <View style={styles.suggestion}>
              <View
                style={[
                  styles.suggestionIcon,
                  { backgroundColor: `${visibleSuggestion.categoryColor}18` },
                ]}
              >
                <Ionicons
                  name={visibleSuggestion.categoryIcon as keyof typeof Ionicons.glyphMap}
                  size={21}
                  color={visibleSuggestion.categoryColor}
                />
              </View>
              <View style={styles.suggestionContent}>
                <Text style={styles.suggestionEyebrow}>LOCAL SUGGESTION</Text>
                <Text style={styles.suggestionTitle}>{visibleSuggestion.categoryName}</Text>
                <Text style={styles.suggestionReason}>
                  {visibleSuggestion.reason === 'same_description'
                    ? `You used this category for the same description before.`
                    : `Based on ${visibleSuggestion.matchCount} similar ${
                        visibleSuggestion.matchCount === 1 ? 'entry' : 'entries'
                      } you categorized.`}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Use suggested ${visibleSuggestion.categoryName} category`}
                  onPress={applyCategorySuggestion}
                  style={styles.useSuggestion}
                >
                  <Text style={styles.useSuggestionText}>Use suggestion</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                </Pressable>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss category suggestion"
                hitSlop={8}
                onPress={() => setDismissedSuggestionKey(normalizedNote)}
                style={styles.dismissSuggestion}
              >
                <Ionicons name="close" size={18} color={colors.muted} />
              </Pressable>
            </View>
          ) : null}

          <View style={styles.sectionHeading}>
            <Text style={styles.label}>Category</Text>
            {!existing && transactions.length ? (
              <Text style={styles.sectionHint}>Recent first</Text>
            ) : null}
          </View>
          <View style={styles.categoryGrid}>
            {relevantCategories.map((category) => {
              const selected = category.id === categoryId;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${category.name} category`}
                  accessibilityState={{ selected }}
                  key={category.id}
                  onPress={() => setCategoryId(category.id)}
                  style={[styles.category, selected && styles.categorySelected]}
                >
                  <View style={[styles.categoryIcon, { backgroundColor: `${category.color}18` }]}>
                    <Ionicons
                      name={category.icon as keyof typeof Ionicons.glyphMap}
                      size={20}
                      color={category.color}
                    />
                  </View>
                  <Text numberOfLines={2} style={styles.categoryText}>
                    {category.name}
                  </Text>
                  {selected ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={colors.primary}
                      style={styles.check}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={existing ? 'Update transaction' : `Save ${type}`}
            accessibilityState={{ disabled: saving }}
            disabled={saving}
            onPress={() => void save(false)}
            style={({ pressed }) => [styles.save, (pressed || saving) && styles.savePressed]}
          >
            <Text style={styles.saveText}>
              {saving ? 'Saving…' : existing ? 'Update transaction' : `Save ${type}`}
            </Text>
          </Pressable>
          {!existing ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Save ${type} and add another`}
              accessibilityState={{ disabled: saving }}
              disabled={saving}
              onPress={() => void save(true)}
              style={({ pressed }) => [
                styles.saveAnother,
                (pressed || saving) && styles.savePressed,
              ]}
            >
              <Ionicons name="add-circle-outline" size={19} color={colors.primary} />
              <Text style={styles.saveAnotherText}>Save & add another</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  close: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 60,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#E8ECE7',
    borderRadius: radius.md,
    padding: 4,
    marginTop: spacing.md,
  },
  segmentOption: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  segmentSelected: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  segmentTextSelected: {
    color: colors.primary,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sectionHint: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  templates: { flexDirection: 'row', gap: spacing.sm },
  templateCard: {
    width: 196,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  templateTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  templateIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateAmount: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  templateTitle: { color: colors.ink, fontSize: 13, fontWeight: '800', marginTop: spacing.md },
  templateMeta: { color: colors.muted, fontSize: 10, marginTop: 3 },
  amountLabel: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  currency: {
    color: colors.muted,
    fontSize: 18,
    fontWeight: '700',
    marginRight: spacing.sm,
  },
  amountInput: {
    flexShrink: 1,
    color: colors.ink,
    fontSize: 42,
    fontWeight: '800',
    minWidth: 120,
    maxWidth: 250,
  },
  amountShortcuts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  amountShortcut: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  amountShortcutText: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  dateInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dateHint: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: spacing.xs,
  },
  label: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  category: {
    flexBasis: '30%',
    flexGrow: 1,
    minWidth: 96,
    maxWidth: '48%',
    minHeight: 108,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  categorySelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  categoryText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  check: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  note: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    color: colors.ink,
    fontSize: 15,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: '#BFD8CA',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  suggestionIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionEyebrow: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  suggestionTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 3,
  },
  suggestionReason: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  useSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  useSuggestionText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  dismissSuggestion: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  save: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginTop: spacing.xl,
  },
  savePressed: {
    opacity: 0.7,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  saveAnother: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
  },
  saveAnotherText: { color: colors.primary, fontSize: 14, fontWeight: '800' },
});

function toLocalDateValue(value: string): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function resolveOccurredAt(
  value: string,
  original?: string,
): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const originalDate = original ? new Date(original) : new Date();
  const date = new Date(
    year,
    month - 1,
    day,
    originalDate.getHours(),
    originalDate.getMinutes(),
    originalDate.getSeconds(),
    originalDate.getMilliseconds(),
  );
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date.toISOString();
}
