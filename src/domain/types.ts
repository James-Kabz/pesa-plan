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

export interface MonthlyBudget {
  id: string; categoryId: string; categoryName: string; categoryIcon: string;
  limitMinor: number; spentMinor: number; month: string;
}

export interface SinkingFund {
  id: string;
  name: string;
  targetMinor: number;
  savedMinor: number;
  targetDate: string | null;
  color: string;
}

export interface SinkingFundInput {
  name: string;
  targetMinor: number;
  targetDate?: string;
  color: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetMinor: number;
  savedMinor: number;
  goalType: 'general' | 'emergency';
  targetDate: string | null;
  color: string;
}

export interface SavingsGoalInput {
  name: string;
  targetMinor: number;
  goalType: 'general' | 'emergency';
  targetDate?: string;
  color: string;
}

export interface Debt {
  id: string;
  name: string;
  creditor: string | null;
  originalBalanceMinor: number;
  balanceMinor: number;
  aprBasisPoints: number;
  minimumPaymentMinor: number;
  dueDay: number | null;
}

export interface DebtInput {
  name: string;
  creditor?: string;
  balanceMinor: number;
  aprBasisPoints: number;
  minimumPaymentMinor: number;
  dueDay?: number;
}

export interface DebtPayment {
  id: string;
  debtId: string;
  amountMinor: number;
  paidAt: string;
  note: string | null;
  debtName?: string;
}
