import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { currentMonthRange, forecastRecurringNet, summarizeTransactions } from '@/domain/money';
import type {
  Account,
  AccountInput,
  Category,
  FinanceTransaction,
  MonthlySummary,
  NewTransaction,
  NewTransfer,
  RecurringInput,
  RecurringTransaction,
  MonthlyBudget,
  SinkingFund,
  SinkingFundInput,
  SavingsGoal,
  SavingsGoalInput,
  Debt,
  DebtInput,
  DebtPayment,
  CategorySpend,
  MonthlyTrend,
  FinancialSnapshot,
  AppPreferences,
  ExpectedIncome,
  OnboardingDraft,
  OnboardingCompletion,
} from '@/domain/types';
import {
  createTransaction,
  createTransfer,
  createRecurring,
  deleteTransaction,
  listAccounts,
  listCategories,
  listTransactions,
  listRecurring,
  postRecurring,
  listBudgets,
  saveBudget,
  saveCustomCategoryBudget,
  deleteBudget,
  saveAccount,
  listSinkingFunds,
  createSinkingFund,
  contributeToFund,
  listSavingsGoals,
  createSavingsGoal,
  assignSavingsGoalAccount,
  contributeToSavingsGoal,
  listDebts,
  createDebt,
  recordDebtPayment,
  listAllDebtPayments,
  listCategorySpending,
  listMonthlyTrends,
  recordFinancialSnapshot,
  listFinancialSnapshots,
  getAppPreferences,
  listExpectedIncome,
  saveOnboardingProgress,
  deferOnboarding,
  restartOnboarding,
  completeOnboarding,
} from '@/data/repository';

interface FinanceContextValue {
  accounts: Account[];
  categories: Category[];
  transactions: FinanceTransaction[];
  monthlyTransactions: FinanceTransaction[];
  monthlySummary: MonthlySummary;
  isLoading: boolean;
  refresh: () => Promise<void>;
  addTransaction: (transaction: NewTransaction) => Promise<void>;
  saveAccount: (account: AccountInput) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  addTransfer: (transfer: NewTransfer) => Promise<void>;
  recurring: RecurringTransaction[];
  addRecurring: (input: RecurringInput) => Promise<void>;
  recordRecurring: (schedule: RecurringTransaction) => Promise<void>;
  budgets: MonthlyBudget[];
  setBudget: (
    categoryId: string,
    limitMinor: number,
    customCategoryName?: string,
  ) => Promise<void>;
  removeBudget: (id: string) => Promise<void>;
  sinkingFunds: SinkingFund[];
  addSinkingFund: (input: SinkingFundInput) => Promise<void>;
  contributeToFund: (id: string, amountMinor: number) => Promise<void>;
  savingsGoals: SavingsGoal[];
  addSavingsGoal: (input: SavingsGoalInput) => Promise<void>;
  linkSavingsGoalAccount: (id: string, accountId: string) => Promise<void>;
  contributeToSavingsGoal: (id: string, amountMinor: number) => Promise<void>;
  debts: Debt[];
  addDebt: (input: DebtInput) => Promise<void>;
  payDebt: (id: string, amountMinor: number, note?: string) => Promise<void>;
  debtPayments: DebtPayment[];
  categorySpending: CategorySpend[];
  monthlyTrends: MonthlyTrend[];
  financialSnapshots: FinancialSnapshot[];
  forecast30DayNetMinor: number;
  preferences: AppPreferences;
  expectedIncome: ExpectedIncome[];
  saveSetupProgress: (step: number, draft: OnboardingDraft) => Promise<void>;
  deferSetup: () => Promise<void>;
  restartSetup: () => Promise<void>;
  completeSetup: (input: OnboardingCompletion) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [monthlyTransactions, setMonthlyTransactions] = useState<FinanceTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [budgets, setBudgets] = useState<MonthlyBudget[]>([]);
  const [sinkingFunds, setSinkingFunds] = useState<SinkingFund[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([]);
  const [categorySpending, setCategorySpending] = useState<CategorySpend[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [financialSnapshots, setFinancialSnapshots] = useState<FinancialSnapshot[]>([]);
  const [preferences, setPreferences] = useState<AppPreferences>({
    mainCurrency: 'KES',
    onboardingStatus: 'complete',
    onboardingStep: 0,
    onboardingDraft: null,
  });
  const [expectedIncome, setExpectedIncome] = useState<ExpectedIncome[]>([]);
  const monthKey = new Date().toISOString().slice(0, 7);

  const refresh = useCallback(async () => {
    const nextPreferences = await getAppPreferences(db);
    const currency = nextPreferences.mainCurrency;
    const [nextAccounts, nextCategories, nextTransactions, nextMonthlyTransactions, nextRecurring, nextBudgets, nextFunds, nextGoals, nextDebts, nextDebtPayments, nextExpectedIncome] =
      await Promise.all([
        listAccounts(db),
        listCategories(db),
        listTransactions(db),
        listTransactions(db, currentMonthRange()),
        listRecurring(db),
        listBudgets(db, monthKey, currency),
        listSinkingFunds(db),
        listSavingsGoals(db),
        listDebts(db),
        listAllDebtPayments(db),
        listExpectedIncome(db),
      ]);

    setPreferences(nextPreferences);
    setAccounts(nextAccounts);
    setCategories(nextCategories);
    setTransactions(nextTransactions);
    setMonthlyTransactions(nextMonthlyTransactions);
    setRecurring(nextRecurring);
    setBudgets(nextBudgets);
    setSinkingFunds(nextFunds);
    setSavingsGoals(nextGoals);
    setDebts(nextDebts);
    setDebtPayments(nextDebtPayments);
    setExpectedIncome(nextExpectedIncome);
    const mainCurrencyAccounts = nextAccounts
      .filter((account) => account.currency === currency)
      .reduce((sum, account) => sum + account.currentBalanceMinor, 0);
    const debtBalance = nextDebts.reduce((sum, debt) => sum + debt.balanceMinor, 0);
    await recordFinancialSnapshot(db, monthKey, currency, mainCurrencyAccounts, debtBalance);
    const [nextCategorySpending, nextMonthlyTrends, nextSnapshots] = await Promise.all([
      listCategorySpending(db, monthKey, currency),
      listMonthlyTrends(db, currency),
      listFinancialSnapshots(db, currency),
    ]);
    setCategorySpending(nextCategorySpending);
    setMonthlyTrends(nextMonthlyTrends);
    setFinancialSnapshots(nextSnapshots);
    setIsLoading(false);
  }, [db, monthKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addTransaction = useCallback(
    async (transaction: NewTransaction) => {
      await createTransaction(db, transaction);
      await refresh();
    },
    [db, refresh],
  );

  const persistAccount = useCallback(
    async (account: AccountInput) => {
      await saveAccount(db, account);
      await refresh();
    },
    [db, refresh],
  );

  const removeTransaction = useCallback(
    async (id: string) => {
      await deleteTransaction(db, id);
      await refresh();
    },
    [db, refresh],
  );

  const addTransfer = useCallback(
    async (transfer: NewTransfer) => {
      await createTransfer(db, transfer);
      await refresh();
    },
    [db, refresh],
  );

  const addRecurring = useCallback(async (input: RecurringInput) => {
    await createRecurring(db, input); await refresh();
  }, [db, refresh]);

  const recordRecurring = useCallback(async (schedule: RecurringTransaction) => {
    await postRecurring(db, schedule); await refresh();
  }, [db, refresh]);

  const setBudget = useCallback(
    async (categoryId: string, limitMinor: number, customCategoryName?: string) => {
      if (customCategoryName) {
        await saveCustomCategoryBudget(db, customCategoryName, monthKey, limitMinor);
      } else {
        await saveBudget(db, categoryId, monthKey, limitMinor);
      }
      await refresh();
    },
    [db, monthKey, refresh],
  );

  const removeBudget = useCallback(async (id: string) => {
    await deleteBudget(db, id);
    await refresh();
  }, [db, refresh]);

  const addSinkingFund = useCallback(async (input: SinkingFundInput) => {
    await createSinkingFund(db, input);
    await refresh();
  }, [db, refresh]);

  const addFundContribution = useCallback(async (id: string, amountMinor: number) => {
    await contributeToFund(db, id, amountMinor);
    await refresh();
  }, [db, refresh]);

  const addSavingsGoal = useCallback(async (input: SavingsGoalInput) => {
    await createSavingsGoal(db, input);
    await refresh();
  }, [db, refresh]);

  const linkSavingsGoalAccount = useCallback(async (id: string, accountId: string) => {
    await assignSavingsGoalAccount(db, id, accountId);
    await refresh();
  }, [db, refresh]);

  const addSavingsContribution = useCallback(async (id: string, amountMinor: number) => {
    await contributeToSavingsGoal(db, id, amountMinor);
    await refresh();
  }, [db, refresh]);

  const addDebt = useCallback(async (input: DebtInput) => {
    await createDebt(db, input);
    await refresh();
  }, [db, refresh]);

  const payDebt = useCallback(async (id: string, amountMinor: number, note?: string) => {
    await recordDebtPayment(db, id, amountMinor, note);
    await refresh();
  }, [db, refresh]);

  const saveSetupProgress = useCallback(async (step: number, draft: OnboardingDraft) => {
    await saveOnboardingProgress(db, step, draft);
    setPreferences((current) => ({
      ...current,
      onboardingStatus: 'pending',
      onboardingStep: step,
      onboardingDraft: draft,
    }));
  }, [db]);

  const deferSetup = useCallback(async () => {
    await deferOnboarding(db);
    setPreferences((current) => ({ ...current, onboardingStatus: 'deferred' }));
  }, [db]);

  const restartSetup = useCallback(async () => {
    await restartOnboarding(db);
    setPreferences((current) => ({ ...current, onboardingStatus: 'pending', onboardingStep: 0 }));
  }, [db]);

  const completeSetup = useCallback(async (input: OnboardingCompletion) => {
    await completeOnboarding(db, input, monthKey);
    await refresh();
  }, [db, monthKey, refresh]);

  const monthlySummary = useMemo(
    () => summarizeTransactions(
      monthlyTransactions.filter((item) => item.currency === preferences.mainCurrency),
    ),
    [monthlyTransactions, preferences.mainCurrency],
  );

  const forecast30DayNetMinor = useMemo(
    () => forecastRecurringNet(recurring, 30, new Date(), preferences.mainCurrency),
    [recurring, preferences.mainCurrency],
  );

  const value = useMemo(
    () => ({
      accounts,
      categories,
      transactions,
      monthlyTransactions,
      monthlySummary,
      isLoading,
      refresh,
      addTransaction,
      saveAccount: persistAccount,
      removeTransaction,
      addTransfer,
      recurring,
      addRecurring,
      recordRecurring,
      budgets,
      setBudget,
      removeBudget,
      sinkingFunds,
      addSinkingFund,
      contributeToFund: addFundContribution,
      savingsGoals,
      addSavingsGoal,
      linkSavingsGoalAccount,
      contributeToSavingsGoal: addSavingsContribution,
      debts,
      addDebt,
      payDebt,
      debtPayments,
      categorySpending,
      monthlyTrends,
      financialSnapshots,
      forecast30DayNetMinor,
      preferences,
      expectedIncome,
      saveSetupProgress,
      deferSetup,
      restartSetup,
      completeSetup,
    }),
    [
      accounts,
      categories,
      transactions,
      monthlyTransactions,
      monthlySummary,
      isLoading,
      refresh,
      addTransaction,
      persistAccount,
      removeTransaction,
      addTransfer,
      recurring,
      addRecurring,
      recordRecurring,
      budgets,
      setBudget,
      removeBudget,
      sinkingFunds,
      addSinkingFund,
      addFundContribution,
      savingsGoals,
      addSavingsGoal,
      linkSavingsGoalAccount,
      addSavingsContribution,
      debts,
      addDebt,
      payDebt,
      debtPayments,
      categorySpending,
      monthlyTrends,
      financialSnapshots,
      forecast30DayNetMinor,
      preferences,
      expectedIncome,
      saveSetupProgress,
      deferSetup,
      restartSetup,
      completeSetup,
    ],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance(): FinanceContextValue {
  const value = useContext(FinanceContext);
  if (!value) throw new Error('useFinance must be used inside FinanceProvider');
  return value;
}
