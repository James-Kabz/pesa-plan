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
});
