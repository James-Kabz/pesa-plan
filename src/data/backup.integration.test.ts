import type { SQLiteDatabase } from 'expo-sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-crypto', () => ({
  getRandomBytesAsync: async (length: number) => new Uint8Array(length).fill(7),
}));

import { createTestDatabase } from '../test/sqlite';
import { createBackup, restoreBackup } from './backup';
import { migrateDatabase } from './migrations';
import { createTransaction, deleteTransaction, listTransactions } from './repository';

describe('backup database integration', () => {
  let db: SQLiteDatabase;
  let closeDatabase: () => void;

  beforeEach(async () => {
    const testDatabase = await createTestDatabase();
    db = testDatabase.expo;
    closeDatabase = () => testDatabase.raw.close();
    await migrateDatabase(db);
  });

  afterEach(() => closeDatabase());

  it('restores every supported table and rolls back malformed rows', async () => {
    await createTransaction(db, {
      accountId: 'starter-cash',
      categoryId: 'salary',
      type: 'income',
      amountMinor: 75_000,
      note: 'Backup fixture',
      occurredAt: '2026-07-24T12:00:00.000Z',
    });
    const backup = await createBackup(db);
    const transaction = (await listTransactions(db))[0];

    await deleteTransaction(db, transaction.id);
    expect(await listTransactions(db)).toHaveLength(0);
    await restoreBackup(db, backup);
    expect((await listTransactions(db))[0]).toMatchObject({
      amountMinor: 75_000,
      note: 'Backup fixture',
    });

    const malformed = structuredClone(backup);
    malformed.tables.accounts[0] = {
      ...malformed.tables.accounts[0],
      unsupported_column: 'must fail',
    };
    await expect(restoreBackup(db, malformed)).rejects.toThrow('Invalid columns in accounts');
    expect(await listTransactions(db)).toHaveLength(1);
  });

  it('restores a Version 1.1 backup without onboarding or currency metadata', async () => {
    await db.runAsync(
      `INSERT INTO financial_snapshots
        (month, currency, account_balance_minor, debt_balance_minor, net_worth_minor, recorded_at)
       VALUES ('2026-07', 'KES', 10000, 0, 10000, '2026-07-31')`,
    );
    const legacy = await createBackup(db);
    delete legacy.tables.app_settings;
    delete legacy.tables.expected_income;
    legacy.tables.financial_snapshots = legacy.tables.financial_snapshots.map(
      ({ currency: _currency, ...row }) => row,
    );

    await restoreBackup(db, legacy);

    const status = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM app_settings WHERE key = 'onboarding_status'`,
    );
    const snapshot = await db.getFirstAsync<{ currency: string }>(
      `SELECT currency FROM financial_snapshots LIMIT 1`,
    );
    expect(status?.value).toBe('complete');
    expect(snapshot?.currency).toBe('KES');
  });
});
