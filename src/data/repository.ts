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
} from '@/domain/types';

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
  await db.withExclusiveTransactionAsync(async (transaction) => {
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

export async function postRecurring(db: SQLiteDatabase, schedule: RecurringTransaction): Promise<void> {
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync(
      `INSERT INTO transactions
        (id, account_id, category_id, type, amount_minor, note, occurred_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`, schedule.accountId,
      schedule.categoryId, schedule.type, schedule.amountMinor, schedule.note,
      new Date().toISOString(), new Date().toISOString(),
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

export async function listBudgets(db: SQLiteDatabase, month: string): Promise<MonthlyBudget[]> {
  return db.getAllAsync<MonthlyBudget>(`
    SELECT b.id, b.category_id AS categoryId, c.name AS categoryName,
      c.icon AS categoryIcon, b.limit_minor AS limitMinor, b.month,
      COALESCE(SUM(t.amount_minor), 0) AS spentMinor
    FROM monthly_budgets b JOIN categories c ON c.id = b.category_id
    LEFT JOIN transactions t ON t.category_id = b.category_id AND t.type = 'expense'
      AND substr(t.occurred_at, 1, 7) = b.month
      AND t.account_id IN (SELECT id FROM accounts WHERE currency = 'KES')
    WHERE b.month = ? GROUP BY b.id ORDER BY c.name
  `, month);
}

export async function saveBudget(db: SQLiteDatabase, categoryId: string, month: string, limitMinor: number) {
  await db.runAsync(
    `INSERT INTO monthly_budgets (id, category_id, month, limit_minor) VALUES (?, ?, ?, ?)
     ON CONFLICT(category_id, month) DO UPDATE SET limit_minor = excluded.limit_minor`,
    `${categoryId}-${month}`, categoryId, month, limitMinor,
  );
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
    SELECT id, name, target_minor AS targetMinor, saved_minor AS savedMinor,
      goal_type AS goalType, target_date AS targetDate, color
    FROM savings_goals ORDER BY created_at
  `);
}

export async function createSavingsGoal(
  db: SQLiteDatabase,
  input: SavingsGoalInput,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO savings_goals
      (id, name, target_minor, saved_minor, goal_type, target_date, color, created_at)
     VALUES (?, ?, ?, 0, ?, ?, ?, ?)`,
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    input.name.trim(),
    input.targetMinor,
    input.goalType,
    input.targetDate || null,
    input.color,
    new Date().toISOString(),
  );
}

export async function contributeToSavingsGoal(
  db: SQLiteDatabase,
  id: string,
  amountMinor: number,
): Promise<void> {
  await db.runAsync(
    'UPDATE savings_goals SET saved_minor = saved_minor + ? WHERE id = ?',
    amountMinor,
    id,
  );
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
  await db.withExclusiveTransactionAsync(async (transaction) => {
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
    ORDER BY p.paid_at DESC LIMIT 20
  `);
}

export async function listCategorySpending(
  db: SQLiteDatabase,
  month: string,
): Promise<CategorySpend[]> {
  return db.getAllAsync<CategorySpend>(
    `SELECT c.id AS categoryId, c.name AS categoryName, c.icon AS categoryIcon,
      SUM(t.amount_minor) AS amountMinor
     FROM transactions t JOIN categories c ON c.id = t.category_id
     JOIN accounts a ON a.id = t.account_id
     WHERE t.type = 'expense' AND a.currency = 'KES' AND substr(t.occurred_at, 1, 7) = ?
     GROUP BY c.id ORDER BY amountMinor DESC`,
    month,
  );
}

export async function listMonthlyTrends(db: SQLiteDatabase): Promise<MonthlyTrend[]> {
  return db.getAllAsync<MonthlyTrend>(`
    SELECT substr(occurred_at, 1, 7) AS month,
      SUM(CASE WHEN type = 'income' THEN amount_minor ELSE 0 END) AS incomeMinor,
      SUM(CASE WHEN type = 'expense' THEN amount_minor ELSE 0 END) AS expenseMinor
    FROM transactions t JOIN accounts a ON a.id = t.account_id
    WHERE a.currency = 'KES'
    GROUP BY substr(occurred_at, 1, 7)
    ORDER BY month DESC LIMIT 6
  `);
}

export async function recordFinancialSnapshot(
  db: SQLiteDatabase,
  month: string,
  accountBalanceMinor: number,
  debtBalanceMinor: number,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO financial_snapshots
      (month, account_balance_minor, debt_balance_minor, net_worth_minor, recorded_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(month) DO UPDATE SET
       account_balance_minor = excluded.account_balance_minor,
       debt_balance_minor = excluded.debt_balance_minor,
       net_worth_minor = excluded.net_worth_minor,
       recorded_at = excluded.recorded_at`,
    month,
    accountBalanceMinor,
    debtBalanceMinor,
    accountBalanceMinor - debtBalanceMinor,
    new Date().toISOString(),
  );
}

export async function listFinancialSnapshots(
  db: SQLiteDatabase,
): Promise<FinancialSnapshot[]> {
  return db.getAllAsync<FinancialSnapshot>(`
    SELECT month, net_worth_minor AS netWorthMinor,
      account_balance_minor AS accountBalanceMinor,
      debt_balance_minor AS debtBalanceMinor
    FROM financial_snapshots ORDER BY month
  `);
}
