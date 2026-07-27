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
import type { AccountType } from '@/domain/types';
import { useFinance } from '@/providers/FinanceProvider';
import { colors, radius, spacing } from '@/theme';

const accountTypes: { value: AccountType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'cash', label: 'Cash', icon: 'cash-outline' },
  { value: 'bank', label: 'Bank', icon: 'business-outline' },
  { value: 'savings', label: 'Savings', icon: 'wallet-outline' },
  { value: 'mobile_money', label: 'Mobile money', icon: 'phone-portrait-outline' },
  { value: 'credit', label: 'Credit', icon: 'card-outline' },
];
const swatches = ['#175C45', '#3177A8', '#8A5B45', '#9C5791', '#C45245', '#6558A5'];

export default function AccountEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { accounts, saveAccount, preferences } = useFinance();
  const existing = useMemo(() => accounts.find((account) => account.id === id), [accounts, id]);
  const [name, setName] = useState(existing?.name ?? '');
  const [type, setType] = useState<AccountType>(existing?.type ?? 'bank');
  const [currency, setCurrency] = useState(existing?.currency ?? preferences.mainCurrency);
  const [openingBalance, setOpeningBalance] = useState(
    existing ? String(existing.openingBalanceMinor / 100) : '',
  );
  const [color, setColor] = useState(existing?.color ?? colors.primary);
  const [saving, setSaving] = useState(false);

  async function submit() {
    const normalizedBalance = openingBalance.replace(/,/g, '').trim();
    const balanceMinor =
      normalizedBalance === '' || Number(normalizedBalance) === 0
        ? 0
        : parseMoneyInput(openingBalance);
    if (!name.trim()) {
      Alert.alert('Name required', 'Give this account a clear name.');
      return;
    }
    if (balanceMinor === null) {
      Alert.alert('Check the balance', 'Use a positive opening balance or leave it blank for zero.');
      return;
    }
    if (!/^[A-Z]{3}$/.test(currency.trim().toUpperCase())) {
      Alert.alert('Check the currency', 'Use a three-letter currency code such as KES or USD.');
      return;
    }

    try {
      setSaving(true);
      await saveAccount({
        id: existing?.id,
        name,
        type,
        currency: currency.trim().toUpperCase(),
        openingBalanceMinor: balanceMinor,
        color,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      setSaving(false);
      Alert.alert(
        'Could not save',
        error instanceof Error ? error.message : 'The account was not saved. Please try again.',
      );
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close account editor" style={styles.headerButton} onPress={() => router.back()}>
            <Ionicons name="close" size={22} color={colors.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>{existing ? 'Edit account' : 'New account'}</Text>
          <View style={styles.headerButton} />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text style={styles.label}>Account name</Text>
          <TextInput
            accessibilityLabel="Account name"
            autoFocus
            value={name}
            onChangeText={setName}
            placeholder="e.g. M-Pesa or Main bank"
            placeholderTextColor="#98A19B"
            style={styles.input}
          />

          <Text style={styles.label}>Account type</Text>
          <View style={styles.typeGrid}>
            {accountTypes.map((option) => {
              const selected = type === option.value;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${option.label} account type`}
                  accessibilityState={{ selected }}
                  key={option.value}
                  onPress={() => setType(option.value)}
                  style={[styles.typeOption, selected && styles.typeSelected]}
                >
                  <Ionicons
                    name={option.icon}
                    size={22}
                    color={selected ? colors.primary : colors.muted}
                  />
                  <Text style={[styles.typeText, selected && styles.typeTextSelected]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.twoColumn}>
            <View style={styles.field}>
              <Text style={styles.label}>Currency</Text>
              <TextInput
                accessibilityLabel="Account currency"
                value={currency}
                onChangeText={setCurrency}
                autoCapitalize="characters"
                maxLength={3}
                style={styles.input}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Opening balance</Text>
              <TextInput
                accessibilityLabel="Opening balance"
                value={openingBalance}
                onChangeText={setOpeningBalance}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#98A19B"
                style={styles.input}
              />
            </View>
          </View>

          <Text style={styles.label}>Color</Text>
          <View style={styles.swatches}>
            {swatches.map((swatch) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Choose color ${swatch}`}
                accessibilityState={{ selected: color === swatch }}
                key={swatch}
                onPress={() => setColor(swatch)}
                style={[styles.swatch, { backgroundColor: swatch }, color === swatch && styles.swatchSelected]}
              >
                {color === swatch ? <Ionicons name="checkmark" size={18} color="#FFFFFF" /> : null}
              </Pressable>
            ))}
          </View>

          {existing ? (
            <View style={styles.notice}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.noticeText}>
                Changing the opening balance adjusts the current balance while preserving transaction history.
              </Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save account"
            accessibilityState={{ disabled: saving }}
            disabled={saving}
            onPress={() => void submit()}
            style={({ pressed }) => [styles.save, (pressed || saving) && styles.pressed]}
          >
            <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save account'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 60 },
  label: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    color: colors.ink,
    fontSize: 15,
  },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeOption: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  typeSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  typeText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  typeTextSelected: { color: colors.primary },
  twoColumn: { flexDirection: 'row', gap: spacing.md },
  field: { flex: 1 },
  swatches: { flexDirection: 'row', gap: spacing.md },
  swatch: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: { borderWidth: 3, borderColor: colors.ink },
  notice: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  noticeText: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 18 },
  save: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginTop: spacing.xl,
  },
  pressed: { opacity: 0.65 },
  saveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
