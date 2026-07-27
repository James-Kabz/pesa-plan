import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatMoney, parseMoneyInput } from '@/domain/money';
import { useFinance } from '@/providers/FinanceProvider';
import { colors, radius, spacing } from '@/theme';

export default function DebtEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { debts, addDebt, payDebt, preferences } = useFinance();
  const debt = debts.find((item) => item.id === id);
  const [name, setName] = useState('');
  const [creditor, setCreditor] = useState('');
  const [balance, setBalance] = useState('');
  const [apr, setApr] = useState('');
  const [minimum, setMinimum] = useState('');
  const [payment, setPayment] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    try {
      setSaving(true);
      if (debt) {
        const amountMinor = parseMoneyInput(payment);
        if (!amountMinor) throw new Error('invalid');
        await payDebt(debt.id, amountMinor);
      } else {
        const balanceMinor = parseMoneyInput(balance);
        const minimumPaymentMinor = minimum.trim() ? parseMoneyInput(minimum) : 0;
        const aprNumber = Number(apr || 0);
        if (!name.trim() || !balanceMinor || minimumPaymentMinor === null || !Number.isFinite(aprNumber) || aprNumber < 0) {
          throw new Error('invalid');
        }
        await addDebt({
          name,
          creditor,
          balanceMinor,
          aprBasisPoints: Math.round(aprNumber * 100),
          minimumPaymentMinor,
        });
      }
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('Check the details', debt ? 'Enter a payment greater than zero.' : 'Enter a name, balance, valid APR, and minimum payment.');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close debt editor" style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>{debt ? `Pay ${debt.name}` : 'Add debt'}</Text>
        <View style={styles.headerButton} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        {debt ? (
          <>
            <Text style={styles.context}>Current balance</Text>
            <Text style={styles.current}>
              {formatMoney(debt.balanceMinor, preferences.mainCurrency)}
            </Text>
            <Text style={styles.label}>Payment amount</Text>
            <MoneyInput value={payment} onChangeText={setPayment} currency={preferences.mainCurrency} autoFocus />
          </>
        ) : (
          <>
            <Text style={styles.label}>Debt name</Text>
            <TextInput accessibilityLabel="Debt name" autoFocus value={name} onChangeText={setName} placeholder="e.g. Visa card" placeholderTextColor="#98A19B" style={styles.input} />
            <Text style={styles.label}>Creditor (optional)</Text>
            <TextInput accessibilityLabel="Creditor" value={creditor} onChangeText={setCreditor} placeholder="Bank or lender" placeholderTextColor="#98A19B" style={styles.input} />
            <Text style={styles.label}>Current balance</Text>
            <MoneyInput value={balance} onChangeText={setBalance} currency={preferences.mainCurrency} />
            <View style={styles.columns}>
              <View style={styles.field}>
                <Text style={styles.label}>APR %</Text>
                <TextInput accessibilityLabel="Annual percentage rate" value={apr} onChangeText={setApr} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#98A19B" style={styles.input} />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Minimum payment</Text>
                <TextInput accessibilityLabel="Minimum payment" value={minimum} onChangeText={setMinimum} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#98A19B" style={styles.input} />
              </View>
            </View>
          </>
        )}
        <Pressable accessibilityRole="button" accessibilityLabel={debt ? 'Record debt payment' : 'Add debt'} accessibilityState={{ disabled: saving }} disabled={saving} style={[styles.save, saving && styles.disabled]} onPress={() => void submit()}>
          <Text style={styles.saveText}>{saving ? 'Saving…' : debt ? 'Record payment' : 'Add debt'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function MoneyInput({ value, onChangeText, currency, autoFocus = false }: { value: string; onChangeText: (value: string) => void; currency: string; autoFocus?: boolean }) {
  return (
    <View style={styles.moneyRow}>
      <Text style={styles.currency}>{currency}</Text>
      <TextInput accessibilityLabel="Money amount" autoFocus={autoFocus} value={value} onChangeText={onChangeText} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#A6AFA9" style={styles.money} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 60 },
  label: { color: colors.ink, fontSize: 13, fontWeight: '800', marginTop: spacing.xl, marginBottom: spacing.sm },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, color: colors.ink, fontSize: 15 },
  moneyRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl },
  currency: { color: colors.muted, fontSize: 18, fontWeight: '700', marginRight: spacing.sm },
  money: { color: colors.ink, fontSize: 38, fontWeight: '800', minWidth: 140 },
  columns: { flexDirection: 'row', gap: spacing.md },
  field: { flex: 1 },
  context: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: spacing.xl },
  current: { color: colors.ink, fontSize: 28, fontWeight: '800', textAlign: 'center', marginTop: spacing.sm },
  save: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.xl },
  saveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.5 },
});
