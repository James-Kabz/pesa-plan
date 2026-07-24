import path from 'node:path';
import type { SQLiteDatabase } from 'expo-sqlite';
import initSqlJs, { type Database, type SqlValue } from 'sql.js';

function normalizeParams(params: unknown[]): SqlValue[] {
  return params.length === 1 && Array.isArray(params[0])
    ? (params[0] as SqlValue[])
    : (params as SqlValue[]);
}

class SqlJsExpoAdapter {
  constructor(private readonly database: Database) {}

  async execAsync(sql: string): Promise<void> {
    this.database.run(sql);
  }

  async getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null> {
    const statement = this.database.prepare(sql);
    try {
      statement.bind(normalizeParams(params));
      return statement.step() ? (statement.getAsObject() as T) : null;
    } finally {
      statement.free();
    }
  }

  async getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]> {
    const statement = this.database.prepare(sql);
    const rows: T[] = [];
    try {
      statement.bind(normalizeParams(params));
      while (statement.step()) {
        rows.push(statement.getAsObject() as T);
      }
      return rows;
    } finally {
      statement.free();
    }
  }

  async runAsync(sql: string, ...params: unknown[]) {
    this.database.run(sql, normalizeParams(params));
    return { changes: this.database.getRowsModified(), lastInsertRowId: 0 };
  }

  async withExclusiveTransactionAsync(
    task: (transaction: SqlJsExpoAdapter) => Promise<void>,
  ): Promise<void> {
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

export async function createTestDatabase(): Promise<{
  raw: Database;
  expo: SQLiteDatabase;
}> {
  const SQL = await initSqlJs({
    locateFile: (file) => path.resolve('node_modules/sql.js/dist', file),
  });
  const raw = new SQL.Database();
  const adapter = new SqlJsExpoAdapter(raw);
  return { raw, expo: adapter as unknown as SQLiteDatabase };
}
