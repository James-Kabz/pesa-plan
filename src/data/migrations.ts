import type { SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 3;

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

  await db.execAsync(`PRAGMA user_version = ${Math.max(version, DATABASE_VERSION)}`);
}
