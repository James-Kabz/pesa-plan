import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  Account,
  Category,
  FinanceTransaction,
  NewTransaction,
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
  type: TransactionType;
  amount_minor: number;
  note: string | null;
  occurred_at: string;
  created_at: string;
}

export async function listAccounts(db: SQLiteDatabase): Promise<Account[]> {
  const rows = await db.getAllAsync<AccountRow>(`
    SELECT
      a.*,
      a.opening_balance_minor + COALESCE(SUM(
        CASE WHEN t.type = 'income' THEN t.amount_minor ELSE -t.amount_minor END
      ), 0) AS current_balance_minor
    FROM accounts a
    LEFT JOIN transactions t ON t.account_id = a.id
    GROUP BY a.id
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
  `;
  const rows = range
    ? await db.getAllAsync<TransactionRow>(
        `${selection}
         WHERE t.occurred_at >= ? AND t.occurred_at < ?
         ORDER BY t.occurred_at DESC, t.created_at DESC`,
        range.start,
        range.end,
      )
    : await db.getAllAsync<TransactionRow>(
        `${selection} ORDER BY t.occurred_at DESC, t.created_at DESC`,
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
