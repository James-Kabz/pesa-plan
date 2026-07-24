export type AccountType = 'cash' | 'bank' | 'mobile_money' | 'credit';
export type TransactionType = 'income' | 'expense';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  openingBalanceMinor: number;
  currentBalanceMinor: number;
  color: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
}

export interface FinanceTransaction {
  id: string;
  accountId: string;
  accountName: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  type: TransactionType;
  amountMinor: number;
  note: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface MonthlySummary {
  incomeMinor: number;
  expenseMinor: number;
  netMinor: number;
  savingsRate: number;
}

export interface NewTransaction {
  accountId: string;
  categoryId: string;
  type: TransactionType;
  amountMinor: number;
  note?: string;
  occurredAt: string;
}
