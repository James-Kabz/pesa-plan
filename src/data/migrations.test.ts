import path from 'node:path';
import initSqlJs, { type Database, type SqlValue } from 'sql.js';
import { describe, expect, it } from 'vitest';
import type { SQLiteDatabase } from 'expo-sqlite';
import { migrateDatabase } from './migrations';

class SqlJsExpoAdapter {
  constructor(private readonly database: Database) {}

  async execAsync(sql: string) {
    this.database.run(sql);
  }

  async getFirstAsync<T>(sql: string, ...params: SqlValue[]): Promise<T | null> {
    const statement = this.database.prepare(sql);
    try {
      statement.bind(params);
      return statement.step() ? (statement.getAsObject() as T) : null;
    } finally {
      statement.free();
    }
  }

  async runAsync(sql: string, ...params: SqlValue[]) {
    this.database.run(sql, params);
    return { changes: this.database.getRowsModified(), lastInsertRowId: 0 };
  }

  async withExclusiveTransactionAsync(
    task: (transaction: SqlJsExpoAdapter) => Promise<void>,
  ) {
    this.database.run('BEGIN');
    try {
      await task(this);
      this.database.run('COMMIT');
    } catch (error) {
      this.database.run('ROLLBACK');
      throw error;
    }
  }
}

async function createTestDatabase() {
  const SQL = await initSqlJs({
    locateFile: (file) => path.resolve('node_modules/sql.js/dist', file),
  });
  const raw = new SQL.Database();
  const adapter = new SqlJsExpoAdapter(raw);
  return { raw, expo: adapter as unknown as SQLiteDatabase };
}

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
      ]),
    );
    expect(raw.exec('PRAGMA user_version')[0].values[0][0]).toBe(7);
    expect(raw.exec('SELECT COUNT(*) FROM accounts')[0].values[0][0]).toBe(1);
    expect(raw.exec('SELECT COUNT(*) FROM categories')[0].values[0][0]).toBe(12);
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
});
