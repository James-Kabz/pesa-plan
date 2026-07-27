import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { parseMoneyInput } from '@/domain/money';
import { useFinance } from '@/providers/FinanceProvider';
import { colors, radius, spacing } from '@/theme';

export default function BudgetEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { budgets, categories, setBudget, removeBudget, preferences } = useFinance();
  const existing = budgets.find((item) => item.id === id);
  const expenseCategories = useMemo(
    () => categories.filter((item) => item.type === 'expense'),
    [categories],
  );
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? expenseCategories[0]?.id ?? '');
  const [amount, setAmount] = useState(existing ? String(existing.limitMinor / 100) : '');
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [customCategoryDraft, setCustomCategoryDraft] = useState('');
  const [customCategoryError, setCustomCategoryError] = useState('');
  const [customCategoryModalVisible, setCustomCategoryModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const isNamingOther = !existing && categoryId === 'other-expense';

  function selectCategory(nextCategoryId: string) {
    if (!existing && nextCategoryId === 'other-expense') {
      setCustomCategoryDraft(customCategoryName);
      setCustomCategoryError('');
      setCustomCategoryModalVisible(true);
      return;
    }
    setCategoryId(nextCategoryId);
  }

  function closeCustomCategoryModal() {
    setCustomCategoryModalVisible(false);
    setCustomCategoryError('');
  }

  function confirmCustomCategory() {
    const normalizedName = customCategoryDraft.trim().replace(/\s+/g, ' ');
    if (normalizedName.length < 2) {
      setCustomCategoryError('Enter a name with at least two characters.');
      return;
    }
    const matchingCategory = expenseCategories.find(
      (category) =>
        category.id !== 'other-expense' &&
        category.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase(),
    );
    if (matchingCategory) {
      setCustomCategoryError(
        `“${matchingCategory.name}” already exists. Cancel and select it from the list.`,
      );
      return;
    }
    setCustomCategoryName(normalizedName);
    setCategoryId('other-expense');
    setCustomCategoryModalVisible(false);
    setCustomCategoryError('');
  }

  async function submit() {
    const limitMinor = parseMoneyInput(amount);
    if (!categoryId || !limitMinor) {
      Alert.alert('Check the budget', 'Choose a category and enter a limit greater than zero.');
      return;
    }
    const normalizedCustomName = customCategoryName.trim().replace(/\s+/g, ' ');
    if (isNamingOther && normalizedCustomName.length < 2) {
      Alert.alert('Name this category', 'Enter a name with at least two characters.');
      return;
    }
    const matchingCategory = expenseCategories.find(
      (category) =>
        category.id !== 'other-expense' &&
        category.name.toLocaleLowerCase() === normalizedCustomName.toLocaleLowerCase(),
    );
    if (isNamingOther && matchingCategory) {
      Alert.alert(
        'Category already exists',
        `Select “${matchingCategory.name}” from the category list instead.`,
      );
      return;
    }
    setSaving(true);
    try {
      await setBudget(
        categoryId,
        limitMinor,
        isNamingOther ? normalizedCustomName : undefined,
      );
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
        <Pressable accessibilityRole="button" accessibilityLabel="Close budget editor" style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>{existing ? 'Edit budget' : 'New budget'}</Text>
        <View style={styles.headerButton} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text style={styles.label}>Monthly limit</Text>
        <View style={styles.amountRow}>
          <Text style={styles.currency}>{preferences.mainCurrency}</Text>
          <TextInput
            accessibilityLabel="Monthly budget limit"
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
                accessibilityRole="button"
                accessibilityLabel={`${category.name} category`}
                accessibilityState={{ selected, disabled: Boolean(existing) }}
                key={category.id}
                disabled={Boolean(existing)}
                onPress={() => selectCategory(category.id)}
                style={[styles.category, selected && styles.selected]}
              >
                <Ionicons
                  name={category.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={selected ? colors.primary : colors.muted}
                />
                <Text style={[styles.categoryText, selected && styles.selectedText]}>
                  {category.id === 'other-expense' && selected && customCategoryName
                    ? customCategoryName
                    : category.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Save budget" accessibilityState={{ disabled: saving }} disabled={saving} style={[styles.save, saving && styles.disabled]} onPress={() => void submit()}>
          <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save budget'}</Text>
        </Pressable>
        {existing ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Remove budget" style={styles.delete} onPress={confirmDelete}>
            <Text style={styles.deleteText}>Remove budget</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={closeCustomCategoryModal}
        transparent
        visible={customCategoryModalVisible}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View
            accessibilityLabel="Name custom budget category"
            accessibilityViewIsModal
            style={styles.modalCard}
          >
            <View style={styles.modalIcon}>
              <Ionicons name="create-outline" size={22} color={colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Name your category</Text>
            <Text style={styles.modalDescription}>
              Give this budget a clear name. It will also be available when adding
              transactions.
            </Text>
            <TextInput
              accessibilityLabel="Custom expense category name"
              autoCapitalize="words"
              autoFocus
              maxLength={40}
              onChangeText={(value) => {
                setCustomCategoryDraft(value);
                if (customCategoryError) setCustomCategoryError('');
              }}
              onSubmitEditing={confirmCustomCategory}
              placeholder="e.g. Pet care"
              placeholderTextColor="#98A19B"
              returnKeyType="done"
              value={customCategoryDraft}
              style={[
                styles.customCategoryInput,
                customCategoryError ? styles.customCategoryInputError : null,
              ]}
            />
            {customCategoryError ? (
              <Text accessibilityRole="alert" style={styles.customCategoryError}>
                {customCategoryError}
              </Text>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel custom category"
                onPress={closeCustomCategoryModal}
                style={styles.modalCancel}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Use custom category name"
                onPress={confirmCustomCategory}
                style={styles.modalConfirm}
              >
                <Text style={styles.modalConfirmText}>Use category</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 31, 25, 0.48)',
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  modalIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
  },
  modalTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '800',
    marginTop: spacing.lg,
  },
  modalDescription: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  customCategoryInput: {
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.ink,
    fontSize: 15,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  customCategoryInputError: {
    borderColor: colors.expense,
  },
  customCategoryError: {
    color: colors.expense,
    fontSize: 11,
    lineHeight: 16,
    marginTop: spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  modalCancel: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  modalCancelText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  modalConfirm: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  save: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.xl },
  saveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  delete: { alignItems: 'center', padding: spacing.lg, marginTop: spacing.sm },
  deleteText: { color: colors.expense, fontSize: 14, fontWeight: '800' },
});
