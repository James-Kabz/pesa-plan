import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { parseMoneyInput } from '@/domain/money';
import { useFinance } from '@/providers/FinanceProvider';
import { colors, radius, spacing } from '@/theme';

export default function GoalEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { savingsGoals, addSavingsGoal, contributeToSavingsGoal } = useFinance();
  const goal = savingsGoals.find((item) => item.id === id);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [goalType, setGoalType] = useState<'general' | 'emergency'>('general');
  const [saving, setSaving] = useState(false);

  async function submit() {
    const amountMinor = parseMoneyInput(amount);
    if (!amountMinor || (!goal && !name.trim())) {
      Alert.alert('Check the details', 'Enter a name and amount greater than zero.');
      return;
    }
    try {
      setSaving(true);
      if (goal) await contributeToSavingsGoal(goal.id, amountMinor);
      else await addSavingsGoal({ name, targetMinor: amountMinor, goalType, color: goalType === 'emergency' ? '#175C45' : '#3177A8' });
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('Could not save', 'Please try again.');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.headerButton} onPress={() => router.back()}><Ionicons name="close" size={22} color={colors.ink} /></Pressable>
        <Text style={styles.headerTitle}>{goal ? `Add to ${goal.name}` : 'New savings goal'}</Text>
        <View style={styles.headerButton} />
      </View>
      <View style={styles.content}>
        {!goal ? (
          <>
            <Text style={styles.label}>Goal name</Text>
            <TextInput autoFocus value={name} onChangeText={setName} placeholder="e.g. Emergency fund" placeholderTextColor="#98A19B" style={styles.input} />
            <Text style={styles.label}>Goal type</Text>
            <View style={styles.segment}>
              {(['general', 'emergency'] as const).map((type) => (
                <Pressable key={type} onPress={() => setGoalType(type)} style={[styles.segmentOption, goalType === type && styles.segmentSelected]}>
                  <Text style={[styles.segmentText, goalType === type && styles.segmentTextSelected]}>{type === 'general' ? 'General' : 'Emergency'}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
        <Text style={styles.label}>{goal ? 'Contribution' : 'Target amount'}</Text>
        <View style={styles.moneyRow}>
          <Text style={styles.currency}>KES</Text>
          <TextInput autoFocus={Boolean(goal)} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#A6AFA9" style={styles.amount} />
        </View>
        <Pressable disabled={saving} style={[styles.save, saving && styles.disabled]} onPress={() => void submit()}>
          <Text style={styles.saveText}>{saving ? 'Saving…' : goal ? 'Add contribution' : 'Create goal'}</Text>
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
  segment: { flexDirection: 'row', backgroundColor: '#E8ECE7', borderRadius: radius.md, padding: 4 },
  segmentOption: { flex: 1, alignItems: 'center', padding: spacing.md, borderRadius: radius.sm },
  segmentSelected: { backgroundColor: colors.surface },
  segmentText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  segmentTextSelected: { color: colors.primary },
  moneyRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl },
  currency: { color: colors.muted, fontSize: 18, fontWeight: '700', marginRight: spacing.sm },
  amount: { color: colors.ink, fontSize: 38, fontWeight: '800', minWidth: 140 },
  save: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.xl },
  saveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.5 },
});
