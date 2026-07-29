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
import {
  formatMoney,
  formatMoneyInput,
  parseMoneyInput,
} from '@/domain/money';
import { useFinance } from '@/providers/FinanceProvider';
import { colors, radius, spacing } from '@/theme';

export default function NewTransferScreen() {
  const { id, toAccountId } = useLocalSearchParams<{
    id?: string;
    toAccountId?: string;
  }>();
  const { accounts, transactions, addTransfer } = useFinance();
  const existing = transactions.find(
    (transaction) => transaction.id === id && transaction.type === 'transfer',
  );
  const requestedDestination = accounts.find(
    (account) =>
      account.id === (existing?.transferToAccountId ?? toAccountId),
  );
  const initialSource =
    accounts.find((account) => account.id === existing?.accountId) ??
    accounts.find(
      (account) =>
        account.id !== requestedDestination?.id &&
        account.currency === requestedDestination?.currency,
    );
  const [fromId, setFromId] = useState(
    initialSource?.id ?? accounts[0]?.id ?? '',
  );
  const from = accounts.find((account) => account.id === fromId);
  const destinations = useMemo(
    () => accounts.filter((account) => account.id !== fromId && account.currency === from?.currency),
    [accounts, from?.currency, fromId],
  );
  const [toId, setToId] = useState(
    destinations.find(
      (account) =>
        account.id === (existing?.transferToAccountId ?? toAccountId),
    )?.id ??
      destinations[0]?.id ??
      '',
  );
  const [amount, setAmount] = useState(
    existing ? formatMoneyInput(String(existing.amountMinor / 100)) : '',
  );
  const [note, setNote] = useState(existing?.note ?? '');
  const [occurredOn, setOccurredOn] = useState(() =>
    toLocalDateValue(existing?.occurredAt ?? new Date().toISOString()),
  );
  const [saving, setSaving] = useState(false);

  function chooseSource(id: string) {
    const nextSource = accounts.find((account) => account.id === id);
    const nextDestination = accounts.find(
      (account) => account.id !== id && account.currency === nextSource?.currency,
    );
    setFromId(id);
    setToId(nextDestination?.id ?? '');
  }

  async function submit() {
    const amountMinor = parseMoneyInput(amount);
    if (!amountMinor || !fromId || !toId) {
      Alert.alert('Check the transfer', 'Choose two accounts and enter an amount greater than zero.');
      return;
    }
    const availableMinor =
      (from?.currentBalanceMinor ?? 0) +
      (existing && existing.accountId === from?.id ? existing.amountMinor : 0);
    if (from && from.type !== 'credit' && amountMinor > availableMinor) {
      Alert.alert(
        'Not enough money',
        `Available balance is ${formatMoney(availableMinor, from.currency)}.`,
      );
      return;
    }
    const occurredAt = resolveOccurredAt(occurredOn, existing?.occurredAt);
    if (!occurredAt) {
      Alert.alert('Check the date', 'Enter a real date in YYYY-MM-DD format.');
      return;
    }
    try {
      setSaving(true);
      await addTransfer({
        id: existing?.id,
        fromAccountId: fromId,
        toAccountId: toId,
        amountMinor,
        note,
        occurredAt,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('Could not transfer', 'The transfer was not recorded. Please try again.');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close transfer editor" style={styles.headerButton} onPress={() => router.back()}>
            <Ionicons name="close" size={22} color={colors.ink} />
          </Pressable>
          <Text accessibilityRole="header" style={styles.headerTitle}>
            {existing ? 'Edit transfer' : 'Transfer money'}
          </Text>
          <View style={styles.headerButton} />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text style={styles.amountLabel}>Amount</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currency}>{from?.currency ?? 'KES'}</Text>
            <TextInput
              accessibilityLabel="Transfer amount"
              autoFocus
              value={amount}
              onChangeText={(value) => setAmount(formatMoneyInput(value))}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#A6AFA9"
              style={styles.amountInput}
            />
          </View>

          <Text style={styles.label}>Transfer date</Text>
          <TextInput
            accessibilityLabel="Transfer date"
            value={occurredOn}
            onChangeText={(value) =>
              setOccurredOn(value.replace(/[^\d-]/g, '').slice(0, 10))
            }
            keyboardType="numbers-and-punctuation"
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#98A19B"
            style={styles.dateInput}
          />
          <Text style={styles.dateHint}>Use YYYY-MM-DD.</Text>

          <Text style={styles.label}>From</Text>
          <View style={styles.options}>
            {accounts.map((account) => (
              <AccountOption
                key={account.id}
                name={account.name}
                balance={formatMoney(account.currentBalanceMinor, account.currency)}
                selected={account.id === fromId}
                onPress={() => chooseSource(account.id)}
              />
            ))}
          </View>

          <View style={styles.arrow}>
            <Ionicons name="arrow-down" size={20} color={colors.primary} />
          </View>
          <Text style={styles.label}>To</Text>
          <View style={styles.options}>
            {destinations.map((account) => (
              <AccountOption
                key={account.id}
                name={account.name}
                balance={formatMoney(account.currentBalanceMinor, account.currency)}
                selected={account.id === toId}
                onPress={() => setToId(account.id)}
              />
            ))}
            {!destinations.length ? (
              <Text style={styles.emptyText}>No other account uses {from?.currency}.</Text>
            ) : null}
          </View>

          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            accessibilityLabel="Transfer note"
            value={note}
            onChangeText={setNote}
            placeholder="Purpose of transfer"
            placeholderTextColor="#98A19B"
            style={styles.note}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={existing ? 'Update transfer' : 'Record transfer'}
            accessibilityState={{ disabled: saving || !toId }}
            disabled={saving || !toId}
            onPress={() => void submit()}
            style={({ pressed }) => [styles.save, (pressed || saving || !toId) && styles.disabled]}
          >
            <Text style={styles.saveText}>
              {saving
                ? 'Saving…'
                : existing
                  ? 'Update transfer'
                  : 'Record transfer'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function AccountOption({
  name,
  balance,
  selected,
  onPress,
}: {
  name: string;
  balance: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${name}, balance ${balance}`} accessibilityState={{ selected }} onPress={onPress} style={[styles.option, selected && styles.optionSelected]}>
      <View style={styles.optionIcon}>
        <Ionicons name="wallet-outline" size={19} color={colors.primary} />
      </View>
      <View style={styles.optionDetails}>
        <Text style={styles.optionName}>{name}</Text>
        <Text style={styles.optionBalance}>{balance}</Text>
      </View>
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={20}
        color={selected ? colors.primary : colors.muted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 60 },
  amountLabel: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: spacing.lg },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' },
  currency: { color: colors.muted, fontSize: 18, fontWeight: '700', marginRight: spacing.sm },
  amountInput: { color: colors.ink, fontSize: 42, fontWeight: '800', minWidth: 120, maxWidth: 250 },
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
    marginTop: spacing.xs,
  },
  label: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  options: { gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginRight: spacing.md,
  },
  optionDetails: { flex: 1 },
  optionName: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  optionBalance: { color: colors.muted, fontSize: 11, marginTop: 3 },
  arrow: {
    alignSelf: 'center',
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    marginBottom: -spacing.lg,
  },
  emptyText: { color: colors.muted, fontSize: 13, paddingVertical: spacing.md },
  note: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
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
  disabled: { opacity: 0.45 },
  saveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
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
