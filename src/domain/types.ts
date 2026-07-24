export type AccountType = 'cash' | 'bank' | 'mobile_money' | 'credit';
export type TransactionType = 'income' | 'expense';
export type TransactionKind = TransactionType | 'transfer';

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
  type: TransactionKind;
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
  id?: string;
  accountId: string;
  categoryId: string;
  type: TransactionType;
  amountMinor: number;
  note?: string;
  occurredAt: string;
}

export interface AccountInput {
  id?: string;
  name: string;
  type: AccountType;
  currency: string;
  openingBalanceMinor: number;
  color: string;
}

export interface NewTransfer {
  fromAccountId: string;
  toAccountId: string;
  amountMinor: number;
  note?: string;
  occurredAt: string;
}

export interface RecurringTransaction {
  id: string; accountId: string; accountName: string; categoryId: string; categoryName: string;
  type: TransactionType; amountMinor: number; note: string | null; frequency: 'weekly' | 'monthly';
  nextDueAt: string; active: boolean;
}

export interface RecurringInput {
  accountId: string; categoryId: string; type: TransactionType; amountMinor: number;
  note?: string; frequency: 'weekly' | 'monthly'; nextDueAt: string;
}
