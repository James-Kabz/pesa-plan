import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { parseMoneyInput } from '@/domain/money';
import { useFinance } from '@/providers/FinanceProvider';
import { colors, radius, spacing } from '@/theme';

export default function BudgetEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { budgets, categories, setBudget, removeBudget } = useFinance();
  const existing = budgets.find((item) => item.id === id);
  const expenseCategories = useMemo(
    () => categories.filter((item) => item.type === 'expense'),
    [categories],
  );
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? expenseCategories[0]?.id ?? '');
  const [amount, setAmount] = useState(existing ? String(existing.limitMinor / 100) : '');
  const [saving, setSaving] = useState(false);

  async function submit() {
    const limitMinor = parseMoneyInput(amount);
    if (!categoryId || !limitMinor) {
      Alert.alert('Check the budget', 'Choose a category and enter a limit greater than zero.');
      return;
    }
    setSaving(true);
    try {
      await setBudget(categoryId, limitMinor);
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('Could not save', 'The budget was not saved.');
    }
  }

  function confirmDelete() {
    if (!existing) return;
    Alert.alert('Remove this budget?', 'Transactions remain unchanged.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void removeBudget(existing.id).then(() => router.back()) },
    ]);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>{existing ? 'Edit budget' : 'New budget'}</Text>
        <View style={styles.headerButton} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text style={styles.label}>Monthly limit</Text>
        <View style={styles.amountRow}>
          <Text style={styles.currency}>KES</Text>
          <TextInput
            autoFocus
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#A6AFA9"
            style={styles.amount}
          />
        </View>

        <Text style={styles.label}>Expense category</Text>
        <View style={styles.grid}>
          {expenseCategories.map((category) => {
            const selected = category.id === categoryId;
            return (
              <Pressable
                key={category.id}
                disabled={Boolean(existing)}
                onPress={() => setCategoryId(category.id)}
                style={[styles.category, selected && styles.selected]}
              >
                <Ionicons
                  name={category.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={selected ? colors.primary : colors.muted}
                />
                <Text style={[styles.categoryText, selected && styles.selectedText]}>
                  {category.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable disabled={saving} style={[styles.save, saving && styles.disabled]} onPress={() => void submit()}>
          <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save budget'}</Text>
        </Pressable>
        {existing ? (
          <Pressable style={styles.delete} onPress={confirmDelete}>
            <Text style={styles.deleteText}>Remove budget</Text>
          </Pressable>
        ) : null}
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
  amountRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl },
  currency: { color: colors.muted, fontSize: 18, fontWeight: '700', marginRight: spacing.sm },
  amount: { color: colors.ink, fontSize: 38, fontWeight: '800', minWidth: 140 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  category: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  selected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  categoryText: { flex: 1, color: colors.muted, fontSize: 12, fontWeight: '700' },
  selectedText: { color: colors.primary },
  save: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.xl },
  saveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  delete: { alignItems: 'center', padding: spacing.lg, marginTop: spacing.sm },
  deleteText: { color: colors.expense, fontSize: 14, fontWeight: '800' },
});
