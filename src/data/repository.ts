import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  Account,
  AccountInput,
  Category,
  FinanceTransaction,
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
  TransactionKind,
  TransactionType,
  AppPreferences,
  ReminderPreferenceKey,
  ExpectedIncome,
  OnboardingDraft,
  OnboardingCompletion,
} from '@/domain/types';
import { withDatabaseTransaction } from './databaseTransaction';

interface AccountRow {
  id: string;
  name: string;
  type: Account['type'];
  currency: string;
  opening_balance_minor: number;
  current_balance_minor: number;
  color: string;
  created_at: string;
}

interface TransactionRow {
  id: string;
  account_id: string;
  transfer_to_account_id: string | null;
  account_name: string;
  category_id: string;
  category_name: string;
  category_icon: string;
  type: TransactionKind;
  amount_minor: number;
  note: string | null;
  occurred_at: string;
  created_at: string;
  currency: string;
}

export async function listAccounts(db: SQLiteDatabase): Promise<Account[]> {
  const rows = await db.getAllAsync<AccountRow>(`
    SELECT
      a.*,
      a.opening_balance_minor
      + COALESCE((
        SELECT SUM(CASE WHEN t.type = 'income' THEN t.amount_minor ELSE -t.amount_minor END)
        FROM transactions t WHERE t.account_id = a.id
      ), 0)
      + COALESCE((
        SELECT SUM(tr.amount_minor) FROM transfers tr WHERE tr.to_account_id = a.id
      ), 0)
      - COALESCE((
        SELECT SUM(tr.amount_minor) FROM transfers tr WHERE tr.from_account_id = a.id
      ), 0) AS current_balance_minor
    FROM accounts a
    ORDER BY a.created_at ASC
  `);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    currency: row.currency,
    openingBalanceMinor: row.opening_balance_minor,
    currentBalanceMinor: row.current_balance_minor,
    color: row.color,
    createdAt: row.created_at,
  }));
}

export async function listCategories(
  db: SQLiteDatabase,
  type?: TransactionType,
): Promise<Category[]> {
  return type
    ? db.getAllAsync<Category>(
        'SELECT id, name, type, icon, color FROM categories WHERE type = ? ORDER BY name',
        type,
      )
    : db.getAllAsync<Category>(
        'SELECT id, name, type, icon, color FROM categories ORDER BY type DESC, name',
      );
}

export async function listTransactions(
  db: SQLiteDatabase,
  range?: { start: string; end: string },
): Promise<FinanceTransaction[]> {
  const selection = `
    SELECT
      t.id,
      t.account_id,
      NULL AS transfer_to_account_id,
      a.name AS account_name,
      t.category_id,
      c.name AS category_name,
      c.icon AS category_icon,
      t.type,
      t.amount_minor,
      t.note,
      t.occurred_at,
      t.created_at
      , a.currency
    FROM transactions t
    JOIN accounts a ON a.id = t.account_id
    JOIN categories c ON c.id = t.category_id
    UNION ALL
    SELECT
      tr.id,
      tr.from_account_id AS account_id,
      tr.to_account_id AS transfer_to_account_id,
      source.name || ' → ' || destination.name AS account_name,
      'transfer' AS category_id,
      'Transfer' AS category_name,
      'swap-horizontal-outline' AS category_icon,
      'transfer' AS type,
      tr.amount_minor,
      tr.note,
      tr.occurred_at,
      tr.created_at
      , source.currency
    FROM transfers tr
    JOIN accounts source ON source.id = tr.from_account_id
    JOIN accounts destination ON destination.id = tr.to_account_id
  `;
  const rows = range
    ? await db.getAllAsync<TransactionRow>(
        `SELECT * FROM (${selection})
         WHERE occurred_at >= ? AND occurred_at < ?
         ORDER BY occurred_at DESC, created_at DESC`,
        range.start,
        range.end,
      )
    : await db.getAllAsync<TransactionRow>(
        `SELECT * FROM (${selection}) ORDER BY occurred_at DESC, created_at DESC`,
      );

  return rows.map((row) => ({
    id: row.id,
    accountId: row.account_id,
    accountName: row.account_name,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryIcon: row.category_icon,
    type: row.type,
    amountMinor: row.amount_minor,
    note: row.note,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
    currency: row.currency,
    transferToAccountId: row.transfer_to_account_id,
  }));
}

export async function createTransaction(
  db: SQLiteDatabase,
  transaction: NewTransaction,
): Promise<void> {
  if (transaction.id) {
    await db.runAsync(
      `UPDATE transactions
       SET account_id = ?, category_id = ?, type = ?, amount_minor = ?, note = ?, occurred_at = ?
       WHERE id = ?`,
      transaction.accountId,
      transaction.categoryId,
      transaction.type,
      transaction.amountMinor,
      transaction.note?.trim() || null,
      transaction.occurredAt,
      transaction.id,
    );
    return;
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await db.runAsync(
    `INSERT INTO transactions
      (id, account_id, category_id, type, amount_minor, note, occurred_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    transaction.accountId,
    transaction.categoryId,
    transaction.type,
    transaction.amountMinor,
    transaction.note?.trim() || null,
    transaction.occurredAt,
    new Date().toISOString(),
  );
}

export async function saveAccount(db: SQLiteDatabase, account: AccountInput): Promise<void> {
  if (account.id) {
    const linkedGoals = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM savings_goals WHERE account_id = ?',
      account.id,
    );
    if (
      (linkedGoals?.count ?? 0) > 0 &&
      account.type !== 'savings'
    ) {
      throw new Error('An account linked to savings goals must remain a savings account');
    }
    await db.runAsync(
      `UPDATE accounts
       SET name = ?, type = ?, currency = ?, opening_balance_minor = ?, color = ?
       WHERE id = ?`,
      account.name.trim(),
      account.type,
      account.currency,
      account.openingBalanceMinor,
      account.color,
      account.id,
    );
    return;
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await db.runAsync(
    `INSERT INTO accounts
      (id, name, type, currency, opening_balance_minor, color, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    account.name.trim(),
    account.type,
    account.currency,
    account.openingBalanceMinor,
    account.color,
    new Date().toISOString(),
  );
}

export async function deleteTransaction(db: SQLiteDatabase, id: string): Promise<void> {
  await withDatabaseTransaction(db, async (transaction) => {
    await transaction.runAsync('DELETE FROM transactions WHERE id = ?', id);
    await transaction.runAsync('DELETE FROM transfers WHERE id = ?', id);
  });
}

export async function createTransfer(
  db: SQLiteDatabase,
  transfer: NewTransfer,
): Promise<void> {
  if (transfer.fromAccountId === transfer.toAccountId) {
    throw new Error('Transfer accounts must be different');
  }
  const transferAccounts = await db.getAllAsync<{ id: string; currency: string }>(
    'SELECT id, currency FROM accounts WHERE id IN (?, ?)',
    transfer.fromAccountId,
    transfer.toAccountId,
  );
  if (
    transferAccounts.length !== 2 ||
    transferAccounts[0].currency !== transferAccounts[1].currency
  ) {
    throw new Error('Transfers require two accounts with the same currency');
  }
  if (transfer.id) {
    await db.runAsync(
      `UPDATE transfers
       SET from_account_id = ?, to_account_id = ?, amount_minor = ?, note = ?, occurred_at = ?
       WHERE id = ?`,
      transfer.fromAccountId,
      transfer.toAccountId,
      transfer.amountMinor,
      transfer.note?.trim() || null,
      transfer.occurredAt,
      transfer.id,
    );
    return;
  }
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await db.runAsync(
    `INSERT INTO transfers
      (id, from_account_id, to_account_id, amount_minor, note, occurred_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    transfer.fromAccountId,
    transfer.toAccountId,
    transfer.amountMinor,
    transfer.note?.trim() || null,
    transfer.occurredAt,
    new Date().toISOString(),
  );
}

export async function listRecurring(db: SQLiteDatabase): Promise<RecurringTransaction[]> {
  return db.getAllAsync<RecurringTransaction>(`
    SELECT r.id, r.account_id AS accountId, a.name AS accountName,
      r.category_id AS categoryId, c.name AS categoryName, r.type,
      r.amount_minor AS amountMinor, r.note, r.frequency, r.next_due_at AS nextDueAt,
      r.active = 1 AS active, a.currency AS accountCurrency
    FROM recurring_transactions r
    JOIN accounts a ON a.id = r.account_id
    JOIN categories c ON c.id = r.category_id
    ORDER BY r.next_due_at
  `);
}

export async function createRecurring(db: SQLiteDatabase, input: RecurringInput): Promise<void> {
  await db.runAsync(
    `INSERT INTO recurring_transactions
      (id, account_id, category_id, type, amount_minor, note, frequency, next_due_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`, input.accountId, input.categoryId,
    input.type, input.amountMinor, input.note?.trim() || null, input.frequency,
    input.nextDueAt, new Date().toISOString(),
  );
}

export async function deleteRecurring(
  db: SQLiteDatabase,
  id: string,
  deletePostedTransactions = false,
): Promise<number> {
  let deletedTransactions = 0;
  await withDatabaseTransaction(db, async (transaction) => {
    if (deletePostedTransactions) {
      const result = await transaction.runAsync(
        'DELETE FROM transactions WHERE recurring_id = ?',
        id,
      );
      deletedTransactions = result.changes;
    }
    await transaction.runAsync(
      'DELETE FROM recurring_transactions WHERE id = ?',
      id,
    );
  });
  return deletedTransactions;
}

export async function postRecurring(db: SQLiteDatabase, schedule: RecurringTransaction): Promise<void> {
  await withDatabaseTransaction(db, async (transaction) => {
    await transaction.runAsync(
      `INSERT INTO transactions
        (id, account_id, category_id, type, amount_minor, note, occurred_at, created_at,
         recurring_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`, schedule.accountId,
      schedule.categoryId, schedule.type, schedule.amountMinor, schedule.note,
      new Date().toISOString(), new Date().toISOString(), schedule.id,
    );
    const next = new Date(schedule.nextDueAt);
    schedule.frequency === 'weekly'
      ? next.setDate(next.getDate() + 7)
      : next.setMonth(next.getMonth() + 1);
    await transaction.runAsync(
      'UPDATE recurring_transactions SET next_due_at = ? WHERE id = ?',
      next.toISOString(), schedule.id,
    );
  });
}

export async function listBudgets(
  db: SQLiteDatabase,
  month: string,
  currency = 'KES',
): Promise<MonthlyBudget[]> {
  return db.getAllAsync<MonthlyBudget>(`
    SELECT b.id, b.category_id AS categoryId, c.name AS categoryName,
      c.icon AS categoryIcon, b.limit_minor AS limitMinor, b.month,
      COALESCE(SUM(t.amount_minor), 0) AS spentMinor
    FROM monthly_budgets b JOIN categories c ON c.id = b.category_id
    LEFT JOIN transactions t ON t.category_id = b.category_id AND t.type = 'expense'
      AND substr(t.occurred_at, 1, 7) = b.month
      AND t.account_id IN (SELECT id FROM accounts WHERE currency = ?)
    WHERE b.month = ? GROUP BY b.id ORDER BY c.name
  `, currency, month);
}

export async function saveBudget(db: SQLiteDatabase, categoryId: string, month: string, limitMinor: number) {
  await db.runAsync(
    `INSERT INTO monthly_budgets (id, category_id, month, limit_minor) VALUES (?, ?, ?, ?)
     ON CONFLICT(category_id, month) DO UPDATE SET limit_minor = excluded.limit_minor`,
    `${categoryId}-${month}`, categoryId, month, limitMinor,
  );
}

export async function saveCustomCategoryBudget(
  db: SQLiteDatabase,
  name: string,
  month: string,
  limitMinor: number,
): Promise<string> {
  const normalizedName = name.trim().replace(/\s+/g, ' ');
  if (normalizedName.length < 2) {
    throw new Error('Custom category name must contain at least two characters.');
  }
  const categoryId = `custom-expense-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await withDatabaseTransaction(db, async (transaction) => {
    await transaction.runAsync(
      `INSERT INTO categories (id, name, type, icon, color) VALUES (?, ?, 'expense', ?, ?)`,
      categoryId,
      normalizedName,
      'ellipsis-horizontal',
      '#6C756F',
    );
    await transaction.runAsync(
      `INSERT INTO monthly_budgets (id, category_id, month, limit_minor)
       VALUES (?, ?, ?, ?)`,
      `${categoryId}-${month}`,
      categoryId,
      month,
      limitMinor,
    );
  });
  return categoryId;
}

export async function deleteBudget(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM monthly_budgets WHERE id = ?', id);
}

export async function listSinkingFunds(db: SQLiteDatabase): Promise<SinkingFund[]> {
  return db.getAllAsync<SinkingFund>(`
    SELECT id, name, target_minor AS targetMinor, saved_minor AS savedMinor,
      target_date AS targetDate, color
    FROM sinking_funds ORDER BY created_at
  `);
}

export async function createSinkingFund(
  db: SQLiteDatabase,
  input: SinkingFundInput,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO sinking_funds
      (id, name, target_minor, saved_minor, target_date, color, created_at)
     VALUES (?, ?, ?, 0, ?, ?, ?)`,
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    input.name.trim(),
    input.targetMinor,
    input.targetDate || null,
    input.color,
    new Date().toISOString(),
  );
}

export async function contributeToFund(
  db: SQLiteDatabase,
  id: string,
  amountMinor: number,
): Promise<void> {
  await db.runAsync(
    'UPDATE sinking_funds SET saved_minor = saved_minor + ? WHERE id = ?',
    amountMinor,
    id,
  );
}

export async function listSavingsGoals(db: SQLiteDatabase): Promise<SavingsGoal[]> {
  return db.getAllAsync<SavingsGoal>(`
    SELECT
      g.id,
      g.name,
      g.target_minor AS targetMinor,
      g.saved_minor AS savedMinor,
      g.goal_type AS goalType,
      g.account_id AS accountId,
      a.name AS accountName,
      CASE WHEN a.id IS NULL THEN NULL ELSE
        a.opening_balance_minor
        + COALESCE((
          SELECT SUM(CASE WHEN t.type = 'income' THEN t.amount_minor ELSE -t.amount_minor END)
          FROM transactions t WHERE t.account_id = a.id
        ), 0)
        + COALESCE((
          SELECT SUM(tr.amount_minor) FROM transfers tr WHERE tr.to_account_id = a.id
        ), 0)
        - COALESCE((
          SELECT SUM(tr.amount_minor) FROM transfers tr WHERE tr.from_account_id = a.id
        ), 0)
      END AS accountBalanceMinor,
      g.target_date AS targetDate,
      g.color
    FROM savings_goals g
    LEFT JOIN accounts a ON a.id = g.account_id
    ORDER BY g.created_at
  `);
}

export async function createSavingsGoal(
  db: SQLiteDatabase,
  input: SavingsGoalInput,
): Promise<void> {
  await withDatabaseTransaction(db, async (transaction) => {
    const account = await transaction.getFirstAsync<{ id: string }>(
      `SELECT id FROM accounts
       WHERE id = ? AND type = 'savings'`,
      input.accountId,
    );
    if (!account) {
      throw new Error('Choose a savings account for this goal');
    }
    await transaction.runAsync(
      `INSERT INTO savings_goals
        (id, name, target_minor, saved_minor, goal_type, account_id, target_date, color, created_at)
       VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?)`,
      `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      input.name.trim(),
      input.targetMinor,
      input.goalType,
      input.accountId,
      input.targetDate || null,
      input.color,
      new Date().toISOString(),
    );
  });
}

export async function assignSavingsGoalAccount(
  db: SQLiteDatabase,
  id: string,
  accountId: string,
): Promise<void> {
  await withDatabaseTransaction(db, async (transaction) => {
    const goal = await transaction.getFirstAsync<{ saved_minor: number }>(
      'SELECT saved_minor FROM savings_goals WHERE id = ?',
      id,
    );
    const account = await transaction.getFirstAsync<{ balance_minor: number }>(
      `SELECT
        a.opening_balance_minor
        + COALESCE((
          SELECT SUM(CASE WHEN t.type = 'income' THEN t.amount_minor ELSE -t.amount_minor END)
          FROM transactions t WHERE t.account_id = a.id
        ), 0)
        + COALESCE((
          SELECT SUM(tr.amount_minor) FROM transfers tr WHERE tr.to_account_id = a.id
        ), 0)
        - COALESCE((
          SELECT SUM(tr.amount_minor) FROM transfers tr WHERE tr.from_account_id = a.id
        ), 0) AS balance_minor
       FROM accounts a
       WHERE a.id = ? AND a.type = 'savings'`,
      accountId,
    );
    if (!goal || !account) throw new Error('Choose a valid savings account');

    const allocation = await transaction.getFirstAsync<{ allocated_minor: number }>(
      `SELECT COALESCE(SUM(saved_minor), 0) AS allocated_minor
       FROM savings_goals WHERE account_id = ? AND id != ?`,
      accountId,
      id,
    );
    if (goal.saved_minor + (allocation?.allocated_minor ?? 0) > account.balance_minor) {
      throw new Error('This savings account does not contain enough unallocated money');
    }

    await transaction.runAsync(
      'UPDATE savings_goals SET account_id = ? WHERE id = ?',
      accountId,
      id,
    );
  });
}

export async function contributeToSavingsGoal(
  db: SQLiteDatabase,
  id: string,
  amountMinor: number,
): Promise<void> {
  if (amountMinor <= 0) throw new Error('Contribution must be greater than zero');
  await withDatabaseTransaction(db, async (transaction) => {
    const goal = await transaction.getFirstAsync<{
      account_id: string | null;
      target_minor: number;
      saved_minor: number;
    }>(
      `SELECT account_id, target_minor, saved_minor
       FROM savings_goals WHERE id = ?`,
      id,
    );
    if (!goal) throw new Error('Savings goal not found');
    if (!goal.account_id) throw new Error('Link this goal to a savings account first');

    const account = await transaction.getFirstAsync<{ balance_minor: number }>(
      `SELECT
        a.opening_balance_minor
        + COALESCE((
          SELECT SUM(CASE WHEN t.type = 'income' THEN t.amount_minor ELSE -t.amount_minor END)
          FROM transactions t WHERE t.account_id = a.id
        ), 0)
        + COALESCE((
          SELECT SUM(tr.amount_minor) FROM transfers tr WHERE tr.to_account_id = a.id
        ), 0)
        - COALESCE((
          SELECT SUM(tr.amount_minor) FROM transfers tr WHERE tr.from_account_id = a.id
        ), 0) AS balance_minor
       FROM accounts a WHERE a.id = ? AND a.type = 'savings'`,
      goal.account_id,
    );
    if (!account) throw new Error('The linked savings account is unavailable');

    const allocation = await transaction.getFirstAsync<{ allocated_minor: number }>(
      `SELECT COALESCE(SUM(saved_minor), 0) AS allocated_minor
       FROM savings_goals WHERE account_id = ?`,
      goal.account_id,
    );
    const unallocatedMinor = account.balance_minor - (allocation?.allocated_minor ?? 0);
    if (amountMinor > unallocatedMinor) {
      throw new Error('This savings account does not contain enough unallocated money');
    }
    if (goal.saved_minor + amountMinor > goal.target_minor) {
      throw new Error('This contribution is greater than the amount remaining for the goal');
    }

    await transaction.runAsync(
      'UPDATE savings_goals SET saved_minor = saved_minor + ? WHERE id = ?',
      amountMinor,
      id,
    );
  });
}

export async function listDebts(db: SQLiteDatabase): Promise<Debt[]> {
  return db.getAllAsync<Debt>(`
    SELECT id, name, creditor, original_balance_minor AS originalBalanceMinor,
      balance_minor AS balanceMinor, apr_basis_points AS aprBasisPoints,
      minimum_payment_minor AS minimumPaymentMinor, due_day AS dueDay
    FROM debts WHERE balance_minor > 0 ORDER BY created_at
  `);
}

export async function createDebt(db: SQLiteDatabase, input: DebtInput): Promise<void> {
  await db.runAsync(
    `INSERT INTO debts
      (id, name, creditor, original_balance_minor, balance_minor, apr_basis_points,
       minimum_payment_minor, due_day, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    input.name.trim(),
    input.creditor?.trim() || null,
    input.balanceMinor,
    input.balanceMinor,
    input.aprBasisPoints,
    input.minimumPaymentMinor,
    input.dueDay ?? null,
    new Date().toISOString(),
  );
}

export async function recordDebtPayment(
  db: SQLiteDatabase,
  debtId: string,
  amountMinor: number,
  note?: string,
): Promise<void> {
  await withDatabaseTransaction(db, async (transaction) => {
    const debt = await transaction.getFirstAsync<{ balance_minor: number }>(
      'SELECT balance_minor FROM debts WHERE id = ?',
      debtId,
    );
    if (!debt) throw new Error('Debt not found');
    const applied = Math.min(amountMinor, debt.balance_minor);
    await transaction.runAsync(
      `INSERT INTO debt_payments (id, debt_id, amount_minor, paid_at, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      debtId,
      applied,
      new Date().toISOString(),
      note?.trim() || null,
      new Date().toISOString(),
    );
    await transaction.runAsync(
      'UPDATE debts SET balance_minor = balance_minor - ? WHERE id = ?',
      applied,
      debtId,
    );
  });
}

export async function listDebtPayments(
  db: SQLiteDatabase,
  debtId: string,
): Promise<DebtPayment[]> {
  return db.getAllAsync<DebtPayment>(
    `SELECT id, debt_id AS debtId, amount_minor AS amountMinor,
      paid_at AS paidAt, note
     FROM debt_payments WHERE debt_id = ? ORDER BY paid_at DESC`,
    debtId,
  );
}

export async function listAllDebtPayments(db: SQLiteDatabase): Promise<DebtPayment[]> {
  return db.getAllAsync<DebtPayment>(`
    SELECT p.id, p.debt_id AS debtId, d.name AS debtName,
      p.amount_minor AS amountMinor, p.paid_at AS paidAt, p.note
    FROM debt_payments p JOIN debts d ON d.id = p.debt_id
    ORDER BY p.paid_at DESC
  `);
}

export async function listCategorySpending(
  db: SQLiteDatabase,
  month: string,
  currency = 'KES',
): Promise<CategorySpend[]> {
  return db.getAllAsync<CategorySpend>(
    `SELECT c.id AS categoryId, c.name AS categoryName, c.icon AS categoryIcon,
      SUM(t.amount_minor) AS amountMinor
     FROM transactions t JOIN categories c ON c.id = t.category_id
     JOIN accounts a ON a.id = t.account_id
     WHERE t.type = 'expense' AND a.currency = ? AND substr(t.occurred_at, 1, 7) = ?
     GROUP BY c.id ORDER BY amountMinor DESC`,
    currency,
    month,
  );
}

export async function listMonthlyTrends(
  db: SQLiteDatabase,
  currency = 'KES',
): Promise<MonthlyTrend[]> {
  return db.getAllAsync<MonthlyTrend>(`
    SELECT substr(t.occurred_at, 1, 7) AS month,
      SUM(CASE WHEN t.type = 'income' THEN t.amount_minor ELSE 0 END) AS incomeMinor,
      SUM(CASE WHEN t.type = 'expense' THEN t.amount_minor ELSE 0 END) AS expenseMinor
    FROM transactions t JOIN accounts a ON a.id = t.account_id
    WHERE a.currency = ?
    GROUP BY substr(t.occurred_at, 1, 7)
    ORDER BY month DESC LIMIT 6
  `, currency);
}

export async function recordFinancialSnapshot(
  db: SQLiteDatabase,
  month: string,
  currency: string,
  accountBalanceMinor: number,
  debtBalanceMinor: number,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO financial_snapshots
      (month, currency, account_balance_minor, debt_balance_minor, net_worth_minor, recorded_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(month, currency) DO UPDATE SET
       account_balance_minor = excluded.account_balance_minor,
       debt_balance_minor = excluded.debt_balance_minor,
       net_worth_minor = excluded.net_worth_minor,
       recorded_at = excluded.recorded_at`,
    month,
    currency,
    accountBalanceMinor,
    debtBalanceMinor,
    accountBalanceMinor - debtBalanceMinor,
    new Date().toISOString(),
  );
}

export async function listFinancialSnapshots(
  db: SQLiteDatabase,
  currency = 'KES',
): Promise<FinancialSnapshot[]> {
  return db.getAllAsync<FinancialSnapshot>(`
    SELECT month, currency, net_worth_minor AS netWorthMinor,
      account_balance_minor AS accountBalanceMinor,
      debt_balance_minor AS debtBalanceMinor
    FROM financial_snapshots WHERE currency = ? ORDER BY month
  `, currency);
}

const DEFAULT_PREFERENCES: AppPreferences = {
  mainCurrency: 'KES',
  onboardingStatus: 'complete',
  onboardingStep: 0,
  onboardingDraft: null,
  remindersEnabled: false,
  remindSchedules: true,
  remindPaydays: true,
  remindWeeklyReview: true,
  debtStrategy: 'avalanche',
};

export async function getAppPreferences(db: SQLiteDatabase): Promise<AppPreferences> {
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    `SELECT key, value FROM app_settings
     WHERE key IN (
       'main_currency',
       'onboarding_status',
       'onboarding_step',
       'onboarding_draft',
       'reminders_enabled',
       'remind_schedules',
       'remind_paydays',
       'remind_weekly_review',
       'debt_strategy'
     )`,
  );
  const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  let draft: OnboardingDraft | null = null;
  if (settings.onboarding_draft) {
    try {
      draft = JSON.parse(settings.onboarding_draft) as OnboardingDraft;
    } catch {
      draft = null;
    }
  }
  const status = settings.onboarding_status;
  return {
    mainCurrency: /^[A-Z]{3}$/.test(settings.main_currency ?? '')
      ? settings.main_currency
      : DEFAULT_PREFERENCES.mainCurrency,
    onboardingStatus:
      status === 'pending' || status === 'deferred' || status === 'complete'
        ? status
        : DEFAULT_PREFERENCES.onboardingStatus,
    onboardingStep: Math.max(0, Math.min(5, Number(settings.onboarding_step) || 0)),
    onboardingDraft: draft,
    remindersEnabled: settings.reminders_enabled === 'true',
    remindSchedules: settings.remind_schedules !== 'false',
    remindPaydays: settings.remind_paydays !== 'false',
    remindWeeklyReview: settings.remind_weekly_review !== 'false',
    debtStrategy:
      settings.debt_strategy === 'snowball' ? 'snowball' : 'avalanche',
  };
}

async function setSetting(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value,
  );
}

const REMINDER_SETTING_KEYS: Record<ReminderPreferenceKey, string> = {
  remindersEnabled: 'reminders_enabled',
  remindSchedules: 'remind_schedules',
  remindPaydays: 'remind_paydays',
  remindWeeklyReview: 'remind_weekly_review',
};

export async function saveReminderPreference(
  db: SQLiteDatabase,
  key: ReminderPreferenceKey,
  value: boolean,
): Promise<void> {
  await setSetting(db, REMINDER_SETTING_KEYS[key], String(value));
}

export async function saveDebtStrategy(
  db: SQLiteDatabase,
  strategy: AppPreferences['debtStrategy'],
): Promise<void> {
  await setSetting(db, 'debt_strategy', strategy);
}

export async function saveOnboardingProgress(
  db: SQLiteDatabase,
  step: number,
  draft: OnboardingDraft,
): Promise<void> {
  await withDatabaseTransaction(db, async (transaction) => {
    await transaction.runAsync(
      `INSERT INTO app_settings (key, value) VALUES ('onboarding_status', 'pending')
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    );
    await transaction.runAsync(
      `INSERT INTO app_settings (key, value) VALUES ('onboarding_step', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      String(step),
    );
    await transaction.runAsync(
      `INSERT INTO app_settings (key, value) VALUES ('onboarding_draft', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      JSON.stringify(draft),
    );
  });
}

export async function deferOnboarding(db: SQLiteDatabase): Promise<void> {
  await setSetting(db, 'onboarding_status', 'deferred');
}

export async function restartOnboarding(db: SQLiteDatabase): Promise<void> {
  await setSetting(db, 'onboarding_status', 'pending');
  await setSetting(db, 'onboarding_step', '0');
}

export async function listExpectedIncome(db: SQLiteDatabase): Promise<ExpectedIncome[]> {
  return db.getAllAsync<ExpectedIncome>(`
    SELECT e.id, e.name, e.amount_minor AS amountMinor, e.account_id AS accountId,
      a.name AS accountName, e.pay_day AS payDay,
      e.amount_is_estimate = 1 AS amountIsEstimate, e.active = 1 AS active
    FROM expected_income e
    JOIN accounts a ON a.id = e.account_id
    WHERE e.active = 1
    ORDER BY e.pay_day, e.created_at
  `);
}

export async function completeOnboarding(
  db: SQLiteDatabase,
  input: OnboardingCompletion,
  month: string,
): Promise<void> {
  await withDatabaseTransaction(db, async (transaction) => {
    const currency = input.draft.mainCurrency.trim().toUpperCase();
    await transaction.runAsync(
      `INSERT INTO app_settings (key, value) VALUES ('main_currency', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      currency,
    );

    if (
      input.expectedIncomeMinor &&
      input.payDay &&
      input.draft.incomeName.trim() &&
      input.draft.incomeAccountId
    ) {
      await transaction.runAsync(
        `INSERT INTO expected_income
          (id, name, amount_minor, account_id, pay_day, amount_is_estimate, active, created_at)
         VALUES ('primary-expected-income', ?, ?, ?, ?, ?, 1, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           amount_minor = excluded.amount_minor,
           account_id = excluded.account_id,
           pay_day = excluded.pay_day,
           amount_is_estimate = excluded.amount_is_estimate,
           active = 1`,
        input.draft.incomeName.trim(),
        input.expectedIncomeMinor,
        input.draft.incomeAccountId,
        input.payDay,
        input.draft.incomeIsEstimate ? 1 : 0,
        new Date().toISOString(),
      );
    } else {
      await transaction.runAsync(
        `UPDATE expected_income SET active = 0 WHERE id = 'primary-expected-income'`,
      );
    }

    for (const categoryId of Object.keys(input.draft.budgetAmounts)) {
      const limitMinor = input.budgetsMinor[categoryId];
      if (limitMinor) {
        await transaction.runAsync(
          `INSERT INTO monthly_budgets (id, category_id, month, limit_minor)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(category_id, month) DO UPDATE SET limit_minor = excluded.limit_minor`,
          `${categoryId}-${month}`,
          categoryId,
          month,
          limitMinor,
        );
      } else {
        await transaction.runAsync(
          `DELETE FROM monthly_budgets WHERE category_id = ? AND month = ?`,
          categoryId,
          month,
        );
      }
    }

    await transaction.runAsync(
      `INSERT INTO app_settings (key, value) VALUES ('onboarding_status', 'complete')
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    );
    await transaction.runAsync(
      `INSERT INTO app_settings (key, value) VALUES ('onboarding_step', '0')
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    );
    await transaction.runAsync(`DELETE FROM app_settings WHERE key = 'onboarding_draft'`);
  });
}
