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
      r.active = 1 AS active
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
