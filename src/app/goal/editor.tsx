import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatMoney, parseMoneyInput } from '@/domain/money';
import { useFinance } from '@/providers/FinanceProvider';
import { colors, radius, spacing } from '@/theme';

export default function GoalEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const {
    accounts,
    savingsGoals,
    addSavingsGoal,
    linkSavingsGoalAccount,
    contributeToSavingsGoal,
    preferences,
  } = useFinance();
  const goal = savingsGoals.find((item) => item.id === id);
  const savingsAccounts = useMemo(
    () => accounts.filter(
      (account) =>
        account.type === 'savings' && account.currency === preferences.mainCurrency,
    ),
    [accounts, preferences.mainCurrency],
  );
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [goalType, setGoalType] = useState<'general' | 'emergency'>('general');
  const [accountId, setAccountId] = useState(goal?.accountId ?? savingsAccounts[0]?.id ?? '');
  const [saving, setSaving] = useState(false);
  const selectedAccount = savingsAccounts.find((account) => account.id === accountId);
  const allocatedToSelected = savingsGoals
    .filter((item) => item.accountId === accountId && item.id !== goal?.id)
    .reduce((sum, item) => sum + item.savedMinor, 0);
  const reservedForCurrent = goal?.savedMinor ?? 0;
  const availableToAllocate = selectedAccount
    ? Math.max(0, selectedAccount.currentBalanceMinor - allocatedToSelected - reservedForCurrent)
    : 0;

  useEffect(() => {
    if (!accountId && savingsAccounts[0]) setAccountId(savingsAccounts[0].id);
  }, [accountId, savingsAccounts]);

  async function submit() {
    const amountMinor = parseMoneyInput(amount);
    if (!accountId) {
      Alert.alert(
        'Savings account required',
        `Create or choose a ${preferences.mainCurrency} savings account first.`,
      );
      return;
    }
    if (!goal && (!amountMinor || !name.trim())) {
      Alert.alert('Check the details', 'Enter a name and target amount greater than zero.');
      return;
    }
    if (goal && !amountMinor && accountId === goal.accountId) {
      Alert.alert('Contribution required', 'Enter an amount to allocate to this goal.');
      return;
    }
    try {
      setSaving(true);
      if (goal) {
        if (accountId !== goal.accountId) await linkSavingsGoalAccount(goal.id, accountId);
        if (amountMinor) await contributeToSavingsGoal(goal.id, amountMinor);
      } else {
        await addSavingsGoal({
          name,
          targetMinor: amountMinor!,
          goalType,
          accountId,
          color: goalType === 'emergency' ? '#175C45' : '#3177A8',
        });
      }
      router.back();
    } catch (error) {
      setSaving(false);
      Alert.alert(
        'Could not save',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close goal editor" style={styles.headerButton} onPress={() => router.back()}><Ionicons name="close" size={22} color={colors.ink} /></Pressable>
        <Text style={styles.headerTitle}>{goal ? `Add to ${goal.name}` : 'New savings goal'}</Text>
        <View style={styles.headerButton} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!goal ? (
          <>
            <Text style={styles.label}>Goal name</Text>
            <TextInput accessibilityLabel="Goal name" autoFocus value={name} onChangeText={setName} placeholder="e.g. Emergency fund" placeholderTextColor="#98A19B" style={styles.input} />
            <Text style={styles.label}>Goal type</Text>
            <View style={styles.segment}>
              {(['general', 'emergency'] as const).map((type) => (
                <Pressable accessibilityRole="button" accessibilityLabel={`${type} goal type`} accessibilityState={{ selected: goalType === type }} key={type} onPress={() => setGoalType(type)} style={[styles.segmentOption, goalType === type && styles.segmentSelected]}>
                  <Text style={[styles.segmentText, goalType === type && styles.segmentTextSelected]}>{type === 'general' ? 'General' : 'Emergency'}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
        <Text style={styles.label}>Savings account</Text>
        {savingsAccounts.length ? (
          <View style={styles.accountList}>
            {savingsAccounts.map((account) => {
              const selected = account.id === accountId;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${account.name}, ${formatMoney(account.currentBalanceMinor, account.currency)} balance`}
                  accessibilityState={{ selected }}
                  key={account.id}
                  onPress={() => setAccountId(account.id)}
                  style={[styles.accountOption, selected && styles.accountSelected]}
                >
                  <View style={styles.accountIcon}>
                    <Ionicons name="wallet-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.accountDetails}>
                    <Text style={styles.accountName}>{account.name}</Text>
                    <Text style={styles.accountBalance}>
                      {formatMoney(account.currentBalanceMinor, account.currency)}
                    </Text>
                  </View>
                  {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.noAccount}>
            <Text style={styles.noAccountTitle}>Create a savings account first</Text>
            <Text style={styles.noAccountText}>
              A goal allocates money that is actually held in a savings account.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create savings account"
              style={styles.createAccount}
              onPress={() => router.push('/account/editor')}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.createAccountText}>Create savings account</Text>
            </Pressable>
          </View>
        )}
        {selectedAccount ? (
          <View style={styles.available}>
            <Text style={styles.availableLabel}>Available to allocate</Text>
            <Text style={styles.availableValue}>
              {formatMoney(availableToAllocate, selectedAccount.currency)}
            </Text>
          </View>
        ) : null}
        <Text style={styles.label}>{goal ? 'Contribution' : 'Target amount'}</Text>
        <View style={styles.moneyRow}>
          <Text style={styles.currency}>{preferences.mainCurrency}</Text>
          <TextInput accessibilityLabel={goal ? 'Contribution amount' : 'Target amount'} autoFocus={Boolean(goal)} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#A6AFA9" style={styles.amount} />
        </View>
        {goal ? (
          <Text style={styles.allocationNote}>
            Contributions reserve existing savings for this goal; they do not create a new
            expense or move money between accounts.
          </Text>
        ) : null}
        <Pressable accessibilityRole="button" accessibilityLabel={goal ? 'Save goal allocation' : 'Create goal'} accessibilityState={{ disabled: saving || !savingsAccounts.length }} disabled={saving || !savingsAccounts.length} style={[styles.save, (saving || !savingsAccounts.length) && styles.disabled]} onPress={() => void submit()}>
          <Text style={styles.saveText}>{saving ? 'Saving…' : goal ? 'Save allocation' : 'Create goal'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 60 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '800', marginTop: spacing.xl, marginBottom: spacing.md },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, color: colors.ink, fontSize: 15 },
  segment: { flexDirection: 'row', backgroundColor: '#E8ECE7', borderRadius: radius.md, padding: 4 },
  segmentOption: { flex: 1, alignItems: 'center', padding: spacing.md, borderRadius: radius.sm },
  segmentSelected: { backgroundColor: colors.surface },
  segmentText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  segmentTextSelected: { color: colors.primary },
  accountList: { gap: spacing.sm },
  accountOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  accountSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  accountIcon: { width: 38, height: 38, borderRadius: radius.sm, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  accountDetails: { flex: 1 },
  accountName: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  accountBalance: { color: colors.muted, fontSize: 12, marginTop: 2 },
  noAccount: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg },
  noAccountTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  noAccountText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: spacing.xs },
  createAccount: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: spacing.xs, backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginTop: spacing.md },
  createAccountText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  available: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.primarySoft, borderRadius: radius.sm, padding: spacing.md, marginTop: spacing.sm },
  availableLabel: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  availableValue: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  moneyRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl },
  currency: { color: colors.muted, fontSize: 18, fontWeight: '700', marginRight: spacing.sm },
  amount: { color: colors.ink, fontSize: 38, fontWeight: '800', minWidth: 140 },
  allocationNote: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: spacing.md, textAlign: 'center' },
  save: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.xl },
  saveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.5 },
});
