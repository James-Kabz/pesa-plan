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
} from '@/domain/types';
import {
  createTransaction,
  createTransfer,
  deleteTransaction,
  listAccounts,
  listCategories,
  listTransactions,
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
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [monthlyTransactions, setMonthlyTransactions] = useState<FinanceTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [nextAccounts, nextCategories, nextTransactions, nextMonthlyTransactions] =
      await Promise.all([
        listAccounts(db),
        listCategories(db),
        listTransactions(db),
        listTransactions(db, currentMonthRange()),
      ]);

    setAccounts(nextAccounts);
    setCategories(nextCategories);
    setTransactions(nextTransactions);
    setMonthlyTransactions(nextMonthlyTransactions);
    setIsLoading(false);
  }, [db]);

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
    ],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance(): FinanceContextValue {
  const value = useContext(FinanceContext);
  if (!value) throw new Error('useFinance must be used inside FinanceProvider');
  return value;
}
