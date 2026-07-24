import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { currentMonthRange, summarizeTransactions } from '@/domain/money';
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
  saveAccount,
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
  setBudget: (categoryId: string, limitMinor: number) => Promise<void>;
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
  const monthKey = new Date().toISOString().slice(0, 7);

  const refresh = useCallback(async () => {
    const [nextAccounts, nextCategories, nextTransactions, nextMonthlyTransactions, nextRecurring, nextBudgets] =
      await Promise.all([
        listAccounts(db),
        listCategories(db),
        listTransactions(db),
        listTransactions(db, currentMonthRange()),
        listRecurring(db),
        listBudgets(db, monthKey),
      ]);

    setAccounts(nextAccounts);
    setCategories(nextCategories);
    setTransactions(nextTransactions);
    setMonthlyTransactions(nextMonthlyTransactions);
    setRecurring(nextRecurring);
    setBudgets(nextBudgets);
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

  const setBudget = useCallback(async (categoryId: string, limitMinor: number) => {
    await saveBudget(db, categoryId, monthKey, limitMinor); await refresh();
  }, [db, monthKey, refresh]);

  const monthlySummary = useMemo(
    () => summarizeTransactions(monthlyTransactions),
    [monthlyTransactions],
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
    ],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance(): FinanceContextValue {
  const value = useContext(FinanceContext);
  if (!value) throw new Error('useFinance must be used inside FinanceProvider');
  return value;
}
