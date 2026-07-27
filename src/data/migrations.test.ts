import { describe, expect, it } from 'vitest';
import { createTestDatabase } from '../test/sqlite';
import { migrateDatabase } from './migrations';

describe('database migrations', () => {
  it('builds the complete schema, seeds defaults, and is idempotent', async () => {
    const { raw, expo } = await createTestDatabase();
    await migrateDatabase(expo);
    await migrateDatabase(expo);

    const tables = raw
      .exec(`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`)[0]
      .values.flat();
    expect(tables).toEqual(
      expect.arrayContaining([
        'accounts',
        'categories',
        'transactions',
        'transfers',
        'recurring_transactions',
        'monthly_budgets',
        'sinking_funds',
        'savings_goals',
        'debts',
        'debt_payments',
        'financial_snapshots',
        'app_settings',
        'expected_income',
      ]),
    );
    expect(raw.exec('PRAGMA user_version')[0].values[0][0]).toBe(10);
    expect(raw.exec('SELECT COUNT(*) FROM accounts')[0].values[0][0]).toBe(1);
    expect(raw.exec('SELECT COUNT(*) FROM categories')[0].values[0][0]).toBe(29);
    expect(
      raw.exec(`SELECT COUNT(*) FROM pragma_table_info('savings_goals') WHERE name = 'account_id'`)[0]
        .values[0][0],
    ).toBe(1);
    expect(
      raw.exec(`SELECT value FROM app_settings WHERE key = 'onboarding_status'`)[0].values,
    ).toEqual([['pending']]);
    raw.close();
  });

  it('recovers an interrupted initial migration without overwriting existing rows', async () => {
    const { raw, expo } = await createTestDatabase();
    await expo.execAsync(`
      CREATE TABLE accounts (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'mobile_money', 'credit')),
        currency TEXT NOT NULL DEFAULT 'KES',
        opening_balance_minor INTEGER NOT NULL DEFAULT 0,
        color TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      INSERT INTO accounts VALUES
        ('starter-cash', 'Recovered wallet', 'cash', 'KES', 5000, '#175C45', '2026-01-01');
      PRAGMA user_version = 0;
    `);

    await migrateDatabase(expo);

    expect(raw.exec('PRAGMA user_version')[0].values[0][0]).toBe(10);
    expect(raw.exec(`SELECT name FROM accounts WHERE id = 'starter-cash'`)[0].values)
      .toEqual([['Recovered wallet']]);
    expect(raw.exec('SELECT COUNT(*) FROM categories')[0].values[0][0]).toBe(29);
    expect(
      raw.exec(`SELECT value FROM app_settings WHERE key = 'onboarding_status'`)[0].values,
    ).toEqual([['complete']]);
    raw.close();
  });

  it('enforces financial integrity constraints', async () => {
    const { raw, expo } = await createTestDatabase();
    await migrateDatabase(expo);
    expect(() =>
      raw.run(
        `INSERT INTO transactions
          (id, account_id, category_id, type, amount_minor, occurred_at, created_at)
         VALUES ('bad', 'starter-cash', 'food', 'expense', -1, 'now', 'now')`,
      ),
    ).toThrow();
    expect(() =>
      raw.run(
        `INSERT INTO transfers
          (id, from_account_id, to_account_id, amount_minor, occurred_at, created_at)
         VALUES ('bad', 'starter-cash', 'starter-cash', 100, 'now', 'now')`,
      ),
    ).toThrow();
    raw.close();
  });

  it('upgrades a populated version-1 database through version 10 without data loss', async () => {
    const { raw, expo } = await createTestDatabase();
    await expo.execAsync(`
      PRAGMA foreign_keys = ON;
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
      INSERT INTO accounts VALUES
        ('legacy-cash', 'Legacy cash', 'cash', 'KES', 10000, '#175C45', '2026-01-01');
      INSERT INTO categories VALUES
        ('legacy-income', 'Legacy income', 'income', 'cash-outline', '#175C45');
      INSERT INTO transactions VALUES
        ('legacy-transaction', 'legacy-cash', 'legacy-income', 'income', 25000,
         'Preserve me', '2026-01-02', '2026-01-02');
      PRAGMA user_version = 1;
    `);

    await migrateDatabase(expo);

    expect(raw.exec('PRAGMA user_version')[0].values[0][0]).toBe(10);
    expect(raw.exec(`SELECT note FROM transactions WHERE id = 'legacy-transaction'`)[0].values)
      .toEqual([['Preserve me']]);
    expect(
      raw.exec(`SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'financial_snapshots'`)[0]
        .values[0][0],
    ).toBe(1);
    expect(raw.exec('PRAGMA foreign_key_check')).toEqual([]);
    raw.run(
      `INSERT INTO accounts VALUES
       ('legacy-savings', 'Legacy savings', 'savings', 'KES', 50000, '#3177A8', '2026-01-03')`,
    );
    expect(raw.exec(`SELECT type FROM accounts WHERE id = 'legacy-savings'`)[0].values)
      .toEqual([['savings']]);
    expect(
      raw.exec(`SELECT value FROM app_settings WHERE key = 'onboarding_status'`)[0].values,
    ).toEqual([['complete']]);
    raw.close();
  });
});
