import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatMoney, parseMoneyInput } from '@/domain/money';
import type { OnboardingDraft } from '@/domain/types';
import { useFinance } from '@/providers/FinanceProvider';
import { colors, radius, spacing } from '@/theme';

const STEPS = ['Welcome', 'Currency', 'Accounts', 'Income', 'Budget', 'Review'] as const;
const STARTER_BUDGET_IDS = [
  'housing',
  'groceries',
  'food',
  'transport',
  'utilities',
  'airtime-data',
  'health',
  'personal-care',
];

function initialDraft(
  mainCurrency: string,
  stored: OnboardingDraft | null,
  expectedIncome: ReturnType<typeof useFinance>['expectedIncome'],
  budgets: ReturnType<typeof useFinance>['budgets'],
): OnboardingDraft {
  if (stored) return stored;
  const income = expectedIncome[0];
  return {
    mainCurrency,
    incomeName: income?.name ?? 'Monthly income',
    incomeAmount: income ? String(income.amountMinor / 100) : '',
    incomeAccountId: income?.accountId ?? '',
    incomePayDay: income ? String(income.payDay) : '',
    incomeIsEstimate: income?.amountIsEstimate ?? false,
    budgetAmounts: Object.fromEntries(
      budgets.map((budget) => [budget.categoryId, String(budget.limitMinor / 100)]),
    ),
  };
}

export default function OnboardingScreen() {
  const {
    accounts,
    categories,
    budgets,
    expectedIncome,
    preferences,
    saveSetupProgress,
    deferSetup,
    completeSetup,
  } = useFinance();
  const [step, setStep] = useState(preferences.onboardingStep);
  const [draft, setDraft] = useState(() =>
    initialDraft(
      preferences.mainCurrency,
      preferences.onboardingDraft,
      expectedIncome,
      budgets,
    ),
  );
  const [saving, setSaving] = useState(false);
  const starterCategories = useMemo(
    () =>
      STARTER_BUDGET_IDS.map((id) => categories.find((category) => category.id === id)).filter(
        (category): category is NonNullable<typeof category> => Boolean(category),
      ),
    [categories],
  );
  const matchingAccounts = accounts.filter(
    (account) => account.currency === draft.mainCurrency.trim().toUpperCase(),
  );

  function update<K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function validate(nextStep: number): boolean {
    if (step === 1 && !/^[A-Z]{3}$/.test(draft.mainCurrency.trim().toUpperCase())) {
      Alert.alert('Check the currency', 'Use a three-letter currency code such as KES or USD.');
      return false;
    }
    if (step === 2 && matchingAccounts.length === 0) {
      Alert.alert(
        'Add an account',
        `Add or edit at least one ${draft.mainCurrency.toUpperCase()} account before continuing.`,
      );
      return false;
    }
    if (step === 3 && draft.incomeAmount.trim()) {
      const amount = parseMoneyInput(draft.incomeAmount);
      const payDay = Number(draft.incomePayDay);
      if (
        !draft.incomeName.trim() ||
        !amount ||
        !matchingAccounts.some((account) => account.id === draft.incomeAccountId)
      ) {
        Alert.alert('Complete the income details', 'Add a name, amount, and receiving account.');
        return false;
      }
      if (!Number.isInteger(payDay) || payDay < 1 || payDay > 31) {
        Alert.alert('Check the pay day', 'Use a day from 1 to 31.');
        return false;
      }
    }
    if (nextStep === 5) {
      const invalidBudget = Object.values(draft.budgetAmounts).some(
        (amount) => amount.trim() !== '' && parseMoneyInput(amount) === null,
      );
      if (invalidBudget) {
        Alert.alert('Check the budget', 'Each budget amount must be greater than zero or blank.');
        return false;
      }
    }
    return true;
  }

  async function goTo(nextStep: number) {
    if (!validate(nextStep)) return;
    const normalizedDraft = {
      ...draft,
      mainCurrency: draft.mainCurrency.trim().toUpperCase(),
    };
    setDraft(normalizedDraft);
    await saveSetupProgress(nextStep, normalizedDraft);
    setStep(nextStep);
  }

  async function leaveSetup() {
    try {
      setSaving(true);
      await saveSetupProgress(step, draft);
      await deferSetup();
      router.replace('/(tabs)');
    } finally {
      setSaving(false);
    }
  }

  async function finish() {
    if (!validate(5)) return;
    const expectedIncomeMinor = draft.incomeAmount.trim()
      ? parseMoneyInput(draft.incomeAmount)
      : null;
    const budgetsMinor = Object.fromEntries(
      Object.entries(draft.budgetAmounts)
        .map(([categoryId, amount]) => [categoryId, parseMoneyInput(amount)] as const)
        .filter((entry): entry is readonly [string, number] => entry[1] !== null),
    );
    try {
      setSaving(true);
      await completeSetup({
        draft: { ...draft, mainCurrency: draft.mainCurrency.trim().toUpperCase() },
        expectedIncomeMinor,
        payDay: expectedIncomeMinor ? Number(draft.incomePayDay) : null,
        budgetsMinor,
      });
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert(
        'Setup was not saved',
        error instanceof Error ? error.message : 'Please try again.',
      );
      setSaving(false);
    }
  }

  const budgetTotal = Object.values(draft.budgetAmounts).reduce(
    (sum, amount) => sum + (parseMoneyInput(amount) ?? 0),
    0,
  );
  const incomeTotal = parseMoneyInput(draft.incomeAmount) ?? 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          {step > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous setup step"
              style={styles.headerButton}
              onPress={() => void goTo(step - 1)}
            >
              <Ionicons name="arrow-back" size={22} color={colors.ink} />
            </Pressable>
          ) : (
            <View style={styles.headerButton} />
          )}
          <View style={styles.progress}>
            {STEPS.map((_, index) => (
              <View
                key={index}
                style={[styles.progressDot, index <= step && styles.progressDotActive]}
              />
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save setup and exit"
            style={styles.headerButton}
            disabled={saving}
            onPress={() => void leaveSetup()}
          >
            <Text style={styles.exitText}>Exit</Text>
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <Text style={styles.eyebrow}>STEP {step + 1} OF {STEPS.length}</Text>
          {step === 0 ? (
            <WelcomeStep
              onStart={() => void goTo(1)}
              onExplore={() => void leaveSetup()}
              saving={saving}
            />
          ) : null}
          {step === 1 ? <CurrencyStep draft={draft} update={update} /> : null}
          {step === 2 ? (
            <AccountsStep
              accounts={accounts}
              currency={draft.mainCurrency}
            />
          ) : null}
          {step === 3 ? (
            <IncomeStep
              draft={draft}
              update={update}
              accounts={matchingAccounts}
            />
          ) : null}
          {step === 4 ? (
            <BudgetStep
              draft={draft}
              update={update}
              categories={starterCategories}
              incomeTotal={incomeTotal}
              budgetTotal={budgetTotal}
            />
          ) : null}
          {step === 5 ? (
            <ReviewStep
              draft={draft}
              accountCount={matchingAccounts.length}
              incomeTotal={incomeTotal}
              budgetTotal={budgetTotal}
            />
          ) : null}
        </ScrollView>

        {step > 0 ? (
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={step === 5 ? 'Finish setup' : 'Continue'}
              accessibilityState={{ disabled: saving }}
              disabled={saving}
              onPress={() => void (step === 5 ? finish() : goTo(step + 1))}
              style={({ pressed }) => [
                styles.primaryButton,
                (pressed || saving) && styles.pressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {saving ? 'Saving…' : step === 5 ? 'Finish setup' : 'Continue'}
              </Text>
              {!saving ? <Ionicons name="arrow-forward" size={19} color="#FFFFFF" /> : null}
            </Pressable>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function WelcomeStep({
  onStart,
  onExplore,
  saving,
}: {
  onStart: () => void;
  onExplore: () => void;
  saving: boolean;
}) {
  return (
    <View>
      <View style={styles.heroIcon}>
        <Ionicons name="sparkles" size={34} color={colors.primary} />
      </View>
      <Text style={styles.title}>Let’s make Pesa Plan yours</Text>
      <Text style={styles.subtitle}>
        A short setup gives you useful balances, budgets, and monthly guidance from the start.
        Everything stays on this device.
      </Text>
      <View style={styles.benefits}>
        <Benefit icon="wallet-outline" text="Your real accounts and opening balances" />
        <Benefit icon="calendar-outline" text="Expected income without counting it as received" />
        <Benefit icon="pie-chart-outline" text="A simple monthly spending plan" />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Set up my finances"
        disabled={saving}
        onPress={onStart}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>Set up my finances</Text>
        <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Explore first"
        disabled={saving}
        onPress={onExplore}
        style={styles.secondaryButton}
      >
        <Text style={styles.secondaryButtonText}>Explore first</Text>
      </Pressable>
    </View>
  );
}

function CurrencyStep({
  draft,
  update,
}: {
  draft: OnboardingDraft;
  update: <K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) => void;
}) {
  return (
    <View>
      <Text style={styles.title}>Choose your main currency</Text>
      <Text style={styles.subtitle}>
        Home, budgets, and reports will focus on this currency. You can still keep accounts in
        other currencies.
      </Text>
      <View style={styles.choiceRow}>
        {['KES', 'USD', 'EUR'].map((currency) => (
          <Pressable
            key={currency}
            accessibilityRole="button"
            accessibilityState={{ selected: draft.mainCurrency === currency }}
            onPress={() => update('mainCurrency', currency)}
            style={[
              styles.currencyChoice,
              draft.mainCurrency === currency && styles.choiceSelected,
            ]}
          >
            <Text
              style={[
                styles.currencyText,
                draft.mainCurrency === currency && styles.choiceTextSelected,
              ]}
            >
              {currency}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Another currency</Text>
      <TextInput
        accessibilityLabel="Main currency code"
        autoCapitalize="characters"
        maxLength={3}
        value={draft.mainCurrency}
        onChangeText={(value) => update('mainCurrency', value.toUpperCase())}
        placeholder="KES"
        placeholderTextColor="#98A19B"
        style={styles.input}
      />
    </View>
  );
}

function AccountsStep({
  accounts,
  currency,
}: {
  accounts: ReturnType<typeof useFinance>['accounts'];
  currency: string;
}) {
  return (
    <View>
      <Text style={styles.title}>Add the places you keep money</Text>
      <Text style={styles.subtitle}>
        Include cash, bank, mobile money, and savings. Set what each account contains today as its
        opening balance.
      </Text>
      <View style={styles.notice}>
        <Ionicons name="information-circle-outline" size={21} color={colors.primary} />
        <Text style={styles.noticeText}>
          An opening balance is your starting point. It is not recorded as monthly income.
        </Text>
      </View>
      <View style={styles.listCard}>
        {accounts.map((account) => (
          <Pressable
            key={account.id}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${account.name}`}
            onPress={() => router.push({ pathname: '/account/editor', params: { id: account.id } })}
            style={styles.accountRow}
          >
            <View style={[styles.accountMark, { backgroundColor: account.color }]} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{account.name}</Text>
              <Text style={styles.rowMeta}>
                {account.type.replace('_', ' ')} · {account.currency}
              </Text>
            </View>
            <Text style={styles.rowAmount}>
              {formatMoney(account.openingBalanceMinor, account.currency)}
            </Text>
            <Ionicons name="chevron-forward" size={17} color={colors.muted} />
          </Pressable>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add another account"
        onPress={() => router.push('/account/editor')}
        style={styles.addButton}
      >
        <Ionicons name="add-circle-outline" size={21} color={colors.primary} />
        <Text style={styles.addButtonText}>Add another account</Text>
      </Pressable>
      <Text style={styles.helper}>
        At least one account should use {currency.toUpperCase()}, your main currency.
      </Text>
    </View>
  );
}

function IncomeStep({
  draft,
  update,
  accounts,
}: {
  draft: OnboardingDraft;
  update: <K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) => void;
  accounts: ReturnType<typeof useFinance>['accounts'];
}) {
  return (
    <View>
      <Text style={styles.title}>What income do you expect?</Text>
      <Text style={styles.subtitle}>
        This builds your plan only. Pesa Plan will not add money to an account until you record
        that it was actually received.
      </Text>
      <Text style={styles.label}>Income source</Text>
      <TextInput
        accessibilityLabel="Income source"
        value={draft.incomeName}
        onChangeText={(value) => update('incomeName', value)}
        placeholder="e.g. Salary or business"
        placeholderTextColor="#98A19B"
        style={styles.input}
      />
      <View style={styles.twoColumn}>
        <View style={styles.field}>
          <Text style={styles.label}>Expected amount</Text>
          <TextInput
            accessibilityLabel="Expected monthly income"
            value={draft.incomeAmount}
            onChangeText={(value) => update('incomeAmount', value)}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#98A19B"
            style={styles.input}
          />
        </View>
        <View style={styles.smallField}>
          <Text style={styles.label}>Pay day</Text>
          <TextInput
            accessibilityLabel="Expected pay day"
            value={draft.incomePayDay}
            onChangeText={(value) => update('incomePayDay', value.replace(/\D/g, '').slice(0, 2))}
            keyboardType="number-pad"
            placeholder="25"
            placeholderTextColor="#98A19B"
            style={styles.input}
          />
        </View>
      </View>
      <Text style={styles.label}>Usually received into</Text>
      <View style={styles.chipWrap}>
        {accounts.map((account) => (
          <Pressable
            key={account.id}
            accessibilityRole="button"
            accessibilityState={{ selected: draft.incomeAccountId === account.id }}
            onPress={() => update('incomeAccountId', account.id)}
            style={[
              styles.accountChip,
              draft.incomeAccountId === account.id && styles.choiceSelected,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                draft.incomeAccountId === account.id && styles.choiceTextSelected,
              ]}
            >
              {account.name}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.switchRow}>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>Amount varies</Text>
          <Text style={styles.rowMeta}>Treat this figure as an estimate</Text>
        </View>
        <Switch
          accessibilityLabel="Income amount varies"
          value={draft.incomeIsEstimate}
          onValueChange={(value) => update('incomeIsEstimate', value)}
          trackColor={{ true: colors.primarySoft }}
          thumbColor={draft.incomeIsEstimate ? colors.primary : '#FFFFFF'}
        />
      </View>
      <Text style={styles.helper}>Leave the amount blank if you do not want to plan income yet.</Text>
    </View>
  );
}

function BudgetStep({
  draft,
  update,
  categories,
  incomeTotal,
  budgetTotal,
}: {
  draft: OnboardingDraft;
  update: <K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) => void;
  categories: ReturnType<typeof useFinance>['categories'];
  incomeTotal: number;
  budgetTotal: number;
}) {
  function updateBudget(categoryId: string, value: string) {
    update('budgetAmounts', { ...draft.budgetAmounts, [categoryId]: value });
  }
  return (
    <View>
      <Text style={styles.title}>Build a basic monthly budget</Text>
      <Text style={styles.subtitle}>
        Start with the categories that matter. Blank categories can be added later.
      </Text>
      <View style={styles.summaryStrip}>
        <SummaryValue label="Expected" value={incomeTotal} currency={draft.mainCurrency} />
        <SummaryValue label="Planned" value={budgetTotal} currency={draft.mainCurrency} />
        <SummaryValue
          label="Unassigned"
          value={incomeTotal - budgetTotal}
          currency={draft.mainCurrency}
        />
      </View>
      {categories.map((category) => (
        <View key={category.id} style={styles.budgetRow}>
          <View style={[styles.categoryIcon, { backgroundColor: `${category.color}18` }]}>
            <Ionicons
              name={category.icon as keyof typeof Ionicons.glyphMap}
              size={19}
              color={category.color}
            />
          </View>
          <Text style={styles.budgetName}>{category.name}</Text>
          <TextInput
            accessibilityLabel={`${category.name} monthly budget`}
            value={draft.budgetAmounts[category.id] ?? ''}
            onChangeText={(value) => updateBudget(category.id, value)}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#98A19B"
            style={styles.budgetInput}
          />
        </View>
      ))}
      <View style={styles.notice}>
        <Ionicons name="leaf-outline" size={21} color={colors.primary} />
        <Text style={styles.noticeText}>
          Savings is money moved to a savings account or goal, not an expense category.
        </Text>
      </View>
    </View>
  );
}

function ReviewStep({
  draft,
  accountCount,
  incomeTotal,
  budgetTotal,
}: {
  draft: OnboardingDraft;
  accountCount: number;
  incomeTotal: number;
  budgetTotal: number;
}) {
  return (
    <View>
      <Text style={styles.title}>Your starting plan is ready</Text>
      <Text style={styles.subtitle}>
        Review the foundation below. You can change every part later from the app.
      </Text>
      <View style={styles.reviewCard}>
        <ReviewRow icon="cash-outline" label="Main currency" value={draft.mainCurrency} />
        <ReviewRow icon="wallet-outline" label="Accounts" value={String(accountCount)} />
        <ReviewRow
          icon="calendar-outline"
          label="Expected monthly income"
          value={incomeTotal ? formatMoney(incomeTotal, draft.mainCurrency) : 'Not set'}
        />
        <ReviewRow
          icon="pie-chart-outline"
          label="Monthly budget"
          value={budgetTotal ? formatMoney(budgetTotal, draft.mainCurrency) : 'Not set'}
        />
        <ReviewRow
          icon="sparkles-outline"
          label="Unassigned"
          value={formatMoney(incomeTotal - budgetTotal, draft.mainCurrency)}
        />
      </View>
      <Text style={styles.helper}>
        Finishing does not create an income transaction. Your balance changes only when you record
        money received, spent, or transferred.
      </Text>
    </View>
  );
}

function Benefit({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.benefitIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

function SummaryValue({
  label,
  value,
  currency,
}: {
  label: string;
  value: number;
  currency: string;
}) {
  return (
    <View style={styles.summaryValue}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={[styles.summaryAmount, value < 0 && styles.negative]}
      >
        {formatMoney(value, currency)}
      </Text>
    </View>
  );
}

function ReviewRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.reviewRow}>
      <View style={styles.reviewIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
    </View>
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
  headerButton: { width: 48, height: 40, alignItems: 'center', justifyContent: 'center' },
  exitText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  progress: { flexDirection: 'row', gap: 6 },
  progressDot: { width: 22, height: 4, borderRadius: radius.pill, backgroundColor: colors.border },
  progressDotActive: { backgroundColor: colors.primary },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: 120 },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: spacing.md,
  },
  heroIcon: {
    width: 70,
    height: 70,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  title: { color: colors.ink, fontSize: 30, lineHeight: 35, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 23, marginTop: spacing.md },
  benefits: { gap: spacing.md, marginVertical: spacing.xxl },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: { flex: 1, color: colors.ink, fontSize: 14, fontWeight: '700' },
  primaryButton: {
    minHeight: 54,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  secondaryButton: { alignItems: 'center', padding: spacing.lg },
  secondaryButtonText: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: colors.canvas,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  choiceRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xxl },
  currencyChoice: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  currencyText: { color: colors.muted, fontSize: 16, fontWeight: '800' },
  choiceTextSelected: { color: colors.primary },
  label: { color: colors.ink, fontSize: 13, fontWeight: '800', marginTop: spacing.xl, marginBottom: spacing.sm },
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
  notice: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  noticeText: { flex: 1, color: colors.primary, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  listCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    marginTop: spacing.xl,
    overflow: 'hidden',
  },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  accountMark: { width: 10, height: 34, borderRadius: radius.pill },
  rowText: { flex: 1 },
  rowTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  rowMeta: { color: colors.muted, fontSize: 12, marginTop: 3, textTransform: 'capitalize' },
  rowAmount: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.lg },
  addButtonText: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: spacing.md },
  twoColumn: { flexDirection: 'row', gap: spacing.md },
  field: { flex: 1 },
  smallField: { width: 100 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  accountChip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  chipText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xl, marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  summaryStrip: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.xl },
  summaryValue: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  summaryLabel: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  summaryAmount: { color: colors.ink, fontSize: 11, fontWeight: '800', marginTop: 4 },
  negative: { color: colors.expense },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  categoryIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  budgetName: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '700' },
  budgetInput: { width: 105, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, color: colors.ink, fontSize: 13, textAlign: 'right', paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  reviewCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginTop: spacing.xxl, overflow: 'hidden' },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  reviewIcon: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  reviewLabel: { flex: 1, color: colors.muted, fontSize: 12 },
  reviewValue: { color: colors.ink, fontSize: 13, fontWeight: '800', maxWidth: '42%', textAlign: 'right' },
  pressed: { opacity: 0.65 },
});
