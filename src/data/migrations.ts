import type { SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 7;

const categories = [
  ['salary', 'Salary', 'income', 'briefcase-outline', '#2B7A5D'],
  ['business', 'Business', 'income', 'storefront-outline', '#3177A8'],
  ['other-income', 'Other income', 'income', 'add-circle-outline', '#6D5DA8'],
  ['food', 'Food & dining', 'expense', 'restaurant-outline', '#D47B3A'],
  ['transport', 'Transport', 'expense', 'car-outline', '#3F75A2'],
  ['housing', 'Housing', 'expense', 'home-outline', '#8A5B45'],
  ['utilities', 'Utilities', 'expense', 'flash-outline', '#B88B22'],
  ['health', 'Health', 'expense', 'medkit-outline', '#C45245'],
  ['shopping', 'Shopping', 'expense', 'bag-handle-outline', '#9C5791'],
  ['entertainment', 'Entertainment', 'expense', 'film-outline', '#6558A5'],
  ['education', 'Education', 'expense', 'school-outline', '#2F8178'],
  ['other-expense', 'Other', 'expense', 'ellipsis-horizontal', '#6C756F'],
] as const;

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');

  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = versionRow?.user_version ?? 0;

  if (version === 0) {
    await db.execAsync(`
      CREATE TABLE accounts (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'mobile_money', 'credit')),
        currency TEXT NOT NULL DEFAULT 'KES',
        opening_balance_minor INTEGER NOT NULL DEFAULT 0,
        color TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE categories (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        icon TEXT NOT NULL,
        color TEXT NOT NULL
      );

      CREATE TABLE transactions (
        id TEXT PRIMARY KEY NOT NULL,
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
        category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
        note TEXT,
        occurred_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX transactions_occurred_at_idx ON transactions(occurred_at DESC);
      CREATE INDEX transactions_account_id_idx ON transactions(account_id);
    `);

    await db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `INSERT INTO accounts
          (id, name, type, currency, opening_balance_minor, color, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        'starter-cash',
        'Cash wallet',
        'cash',
        'KES',
        0,
        '#175C45',
        new Date().toISOString(),
      );

      for (const category of categories) {
        await transaction.runAsync(
          `INSERT INTO categories (id, name, type, icon, color)
           VALUES (?, ?, ?, ?, ?)`,
          ...category,
        );
      }
    });

    version = 1;
  }

  if (version === 1) {
    await db.execAsync(`
      CREATE TABLE transfers (
        id TEXT PRIMARY KEY NOT NULL,
        from_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
        to_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
        amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
        note TEXT,
        occurred_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        CHECK (from_account_id != to_account_id)
      );

      CREATE INDEX transfers_from_account_idx ON transfers(from_account_id);
      CREATE INDEX transfers_to_account_idx ON transfers(to_account_id);
      CREATE INDEX transfers_occurred_at_idx ON transfers(occurred_at DESC);
    `);
    version = 2;
  }

  if (version === 2) {
    await db.execAsync(`
      CREATE TABLE recurring_transactions (
        id TEXT PRIMARY KEY NOT NULL,
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
        category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
        note TEXT,
        frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly')),
        next_due_at TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      );
    `);
    version = 3;
  }

  if (version === 3) {
    await db.execAsync(`
      CREATE TABLE monthly_budgets (
        id TEXT PRIMARY KEY NOT NULL,
        category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        month TEXT NOT NULL,
        limit_minor INTEGER NOT NULL CHECK (limit_minor > 0),
        UNIQUE(category_id, month)
      );
    `);
    version = 4;
  }

  if (version === 4) {
    await db.execAsync(`
      CREATE TABLE sinking_funds (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        target_minor INTEGER NOT NULL CHECK (target_minor > 0),
        saved_minor INTEGER NOT NULL DEFAULT 0 CHECK (saved_minor >= 0),
        target_date TEXT,
        color TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
    version = 5;
  }

  if (version === 5) {
    await db.execAsync(`
      CREATE TABLE savings_goals (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        target_minor INTEGER NOT NULL CHECK (target_minor > 0),
        saved_minor INTEGER NOT NULL DEFAULT 0 CHECK (saved_minor >= 0),
        goal_type TEXT NOT NULL CHECK (goal_type IN ('general', 'emergency')),
        target_date TEXT,
        color TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE debts (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        creditor TEXT,
        original_balance_minor INTEGER NOT NULL CHECK (original_balance_minor > 0),
        balance_minor INTEGER NOT NULL CHECK (balance_minor >= 0),
        apr_basis_points INTEGER NOT NULL CHECK (apr_basis_points >= 0),
        minimum_payment_minor INTEGER NOT NULL CHECK (minimum_payment_minor >= 0),
        due_day INTEGER CHECK (due_day BETWEEN 1 AND 31),
        created_at TEXT NOT NULL
      );

      CREATE TABLE debt_payments (
        id TEXT PRIMARY KEY NOT NULL,
        debt_id TEXT NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
        amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
        paid_at TEXT NOT NULL,
        note TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX debt_payments_debt_idx ON debt_payments(debt_id, paid_at DESC);
    `);
    version = 6;
  }

  if (version === 6) {
    await db.execAsync(`
      CREATE TABLE financial_snapshots (
        month TEXT PRIMARY KEY NOT NULL,
        account_balance_minor INTEGER NOT NULL,
        debt_balance_minor INTEGER NOT NULL,
        net_worth_minor INTEGER NOT NULL,
        recorded_at TEXT NOT NULL
      );
    `);
    version = 7;
  }

  await db.execAsync(`PRAGMA user_version = ${Math.max(version, DATABASE_VERSION)}`);
}
