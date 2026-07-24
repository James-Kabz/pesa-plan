import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { parseMoneyInput } from '@/domain/money';
import { useFinance } from '@/providers/FinanceProvider';
import { colors, radius, spacing } from '@/theme';

const swatches = ['#175C45', '#3177A8', '#8A5B45', '#9C5791', '#C45245', '#6558A5'];

export default function FundEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { sinkingFunds, addSinkingFund, contributeToFund } = useFinance();
  const fund = sinkingFunds.find((item) => item.id === id);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [color, setColor] = useState<string>(colors.primary);
  const [saving, setSaving] = useState(false);

  async function submit() {
    const amountMinor = parseMoneyInput(amount);
    if (!amountMinor || (!fund && !name.trim())) {
      Alert.alert('Check the details', 'Enter a name and an amount greater than zero.');
      return;
    }
    try {
      setSaving(true);
      if (fund) await contributeToFund(fund.id, amountMinor);
      else await addSinkingFund({ name, targetMinor: amountMinor, color });
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('Could not save', 'Please try again.');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close sinking fund editor" style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>{fund ? `Add to ${fund.name}` : 'New sinking fund'}</Text>
        <View style={styles.headerButton} />
      </View>
      <View style={styles.content}>
        {!fund ? (
          <>
            <Text style={styles.label}>Fund name</Text>
            <TextInput accessibilityLabel="Fund name" autoFocus value={name} onChangeText={setName} placeholder="e.g. Car insurance" placeholderTextColor="#98A19B" style={styles.input} />
          </>
        ) : null}
        <Text style={styles.label}>{fund ? 'Contribution' : 'Savings target'}</Text>
        <View style={styles.amountRow}>
          <Text style={styles.currency}>KES</Text>
          <TextInput accessibilityLabel={fund ? 'Contribution amount' : 'Savings target'} autoFocus={Boolean(fund)} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#A6AFA9" style={styles.amount} />
        </View>
        {!fund ? (
          <>
            <Text style={styles.label}>Color</Text>
            <View style={styles.swatches}>
              {swatches.map((swatch) => (
                <Pressable accessibilityRole="button" accessibilityLabel={`Choose color ${swatch}`} accessibilityState={{ selected: color === swatch }} key={swatch} onPress={() => setColor(swatch)} style={[styles.swatch, { backgroundColor: swatch }, color === swatch && styles.selected]}>
                  {color === swatch ? <Ionicons name="checkmark" size={18} color="#FFFFFF" /> : null}
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
        <Pressable accessibilityRole="button" accessibilityLabel={fund ? 'Add contribution' : 'Create fund'} accessibilityState={{ disabled: saving }} disabled={saving} style={[styles.save, saving && styles.disabled]} onPress={() => void submit()}>
          <Text style={styles.saveText}>{saving ? 'Saving…' : fund ? 'Add contribution' : 'Create fund'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  content: { paddingHorizontal: spacing.lg },
  label: { color: colors.ink, fontSize: 14, fontWeight: '800', marginTop: spacing.xl, marginBottom: spacing.md },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, color: colors.ink, fontSize: 15 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl },
  currency: { color: colors.muted, fontSize: 18, fontWeight: '700', marginRight: spacing.sm },
  amount: { color: colors.ink, fontSize: 38, fontWeight: '800', minWidth: 140 },
  swatches: { flexDirection: 'row', gap: spacing.md },
  swatch: { width: 42, height: 42, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  selected: { borderWidth: 3, borderColor: colors.ink },
  save: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.xl },
  saveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.5 },
});
