import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
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
import { parseMoneyInput } from '@/domain/money';
import type { TransactionType } from '@/domain/types';
import { useFinance } from '@/providers/FinanceProvider';
import { colors, radius, spacing } from '@/theme';

export default function NewTransactionScreen() {
  const params = useLocalSearchParams<{ type?: string; id?: string }>();
  const { accounts, categories, addTransaction } = useFinance();
  const { transactions } = useFinance();
  const existing = transactions.find((transaction) => transaction.id === params.id);
  const initialType: TransactionType =
    existing?.type === 'income' || params.type === 'income' ? 'income' : 'expense';
  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState(existing ? String(existing.amountMinor / 100) : '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [accountId, setAccountId] = useState(existing?.accountId ?? accounts[0]?.id ?? '');
  const relevantCategories = useMemo(
    () => categories.filter((category) => category.type === type),
    [categories, type],
  );
  const [categoryId, setCategoryId] = useState(
    existing?.categoryId ??
      categories.find((category) => category.type === initialType)?.id ??
      '',
  );
  const [saving, setSaving] = useState(false);
  const selectedAccount = accounts.find((account) => account.id === accountId);

  function changeType(nextType: TransactionType) {
    setType(nextType);
    setCategoryId(categories.find((category) => category.type === nextType)?.id ?? '');
  }

  async function save() {
    const amountMinor = parseMoneyInput(amount);
    if (!amountMinor) {
      Alert.alert('Check the amount', 'Enter an amount greater than zero with up to two decimals.');
      return;
    }
    if (!accountId || !categoryId) {
      Alert.alert('Missing details', 'Choose an account and category.');
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
        occurredAt: existing?.occurredAt ?? new Date().toISOString(),
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
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
          <Pressable style={styles.close} onPress={() => router.back()}>
            <Ionicons name="close" size={22} color={colors.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>{existing ? 'Edit transaction' : 'New transaction'}</Text>
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

          <Text style={styles.amountLabel}>Amount</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currency}>{selectedAccount?.currency ?? 'KES'}</Text>
            <TextInput
              autoFocus
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#A6AFA9"
              style={styles.amountInput}
            />
          </View>

          <Text style={styles.label}>Account</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chips}>
              {accounts.map((account) => (
                <Pressable
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

          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryGrid}>
            {relevantCategories.map((category) => {
              const selected = category.id === categoryId;
              return (
                <Pressable
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

          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="What was this for?"
            placeholderTextColor="#98A19B"
            style={styles.note}
          />

          <Pressable
            disabled={saving}
            onPress={() => void save()}
            style={({ pressed }) => [styles.save, (pressed || saving) && styles.savePressed]}
          >
            <Text style={styles.saveText}>
              {saving ? 'Saving…' : existing ? 'Update transaction' : `Save ${type}`}
            </Text>
          </Pressable>
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
    color: colors.ink,
    fontSize: 42,
    fontWeight: '800',
    minWidth: 120,
    maxWidth: 250,
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
    width: '31%',
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
});
