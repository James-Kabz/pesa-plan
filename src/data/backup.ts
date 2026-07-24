import type { SQLiteDatabase } from 'expo-sqlite';
import { gcm } from '@noble/ciphers/aes.js';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import { fromByteArray, toByteArray } from 'base64-js';
import { getRandomBytesAsync } from 'expo-crypto';
import { withDatabaseTransaction } from './databaseTransaction';

type BackupValue = string | number | null;
type BackupRow = Record<string, BackupValue>;

const TABLES = [
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
] as const;

const DELETE_ORDER = [...TABLES].reverse();

export interface PesaPlanBackup {
  format: 'pesa-plan-backup';
  version: 1;
  createdAt: string;
  tables: Record<string, BackupRow[]>;
}

interface EncryptedBackupEnvelope {
  format: 'pesa-plan-encrypted-backup';
  version: 1;
  iterations: number;
  salt: string;
  nonce: string;
  ciphertext: string;
}

const BACKUP_KDF_ITERATIONS = 120_000;

export async function createBackup(db: SQLiteDatabase): Promise<PesaPlanBackup> {
  const tables: Record<string, BackupRow[]> = {};
  for (const table of TABLES) {
    tables[table] = await db.getAllAsync<BackupRow>(`SELECT * FROM ${table}`);
  }
  return {
    format: 'pesa-plan-backup',
    version: 1,
    createdAt: new Date().toISOString(),
    tables,
  };
}

export function parseBackup(content: string): PesaPlanBackup {
  const value: unknown = JSON.parse(content);
  if (
    !value ||
    typeof value !== 'object' ||
    !('format' in value) ||
    value.format !== 'pesa-plan-backup' ||
    !('version' in value) ||
    value.version !== 1 ||
    !('tables' in value) ||
    !value.tables ||
    typeof value.tables !== 'object'
  ) {
    throw new Error('Unsupported backup file');
  }
  return value as PesaPlanBackup;
}

export async function encryptBackup(
  backup: PesaPlanBackup,
  password: string,
): Promise<string> {
  if (password.length < 8) throw new Error('Backup password must be at least 8 characters');
  const [salt, nonce] = await Promise.all([
    getRandomBytesAsync(16),
    getRandomBytesAsync(12),
  ]);
  const key = await pbkdf2Async(sha256, utf8ToBytes(password), salt, {
    c: BACKUP_KDF_ITERATIONS,
    dkLen: 32,
  });
  const ciphertext = gcm(key, nonce).encrypt(utf8ToBytes(JSON.stringify(backup)));
  const envelope: EncryptedBackupEnvelope = {
    format: 'pesa-plan-encrypted-backup',
    version: 1,
    iterations: BACKUP_KDF_ITERATIONS,
    salt: fromByteArray(salt),
    nonce: fromByteArray(nonce),
    ciphertext: fromByteArray(ciphertext),
  };
  return JSON.stringify(envelope);
}

export async function decryptBackup(content: string, password: string): Promise<PesaPlanBackup> {
  const envelope = JSON.parse(content) as Partial<EncryptedBackupEnvelope>;
  if (
    envelope.format !== 'pesa-plan-encrypted-backup' ||
    envelope.version !== 1 ||
    typeof envelope.iterations !== 'number' ||
    typeof envelope.salt !== 'string' ||
    typeof envelope.nonce !== 'string' ||
    typeof envelope.ciphertext !== 'string'
  ) {
    throw new Error('Unsupported encrypted backup');
  }
  const key = await pbkdf2Async(
    sha256,
    utf8ToBytes(password),
    toByteArray(envelope.salt),
    { c: envelope.iterations, dkLen: 32 },
  );
  const plaintext = gcm(key, toByteArray(envelope.nonce)).decrypt(
    toByteArray(envelope.ciphertext),
  );
  return parseBackup(new TextDecoder().decode(plaintext));
}

export async function restoreBackup(
  db: SQLiteDatabase,
  backup: PesaPlanBackup,
): Promise<void> {
  for (const table of TABLES) {
    if (!Array.isArray(backup.tables[table])) {
      throw new Error(`Backup is missing ${table}`);
    }
  }

  const columnsByTable: Record<string, string[]> = {};
  for (const table of TABLES) {
    const info = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
    columnsByTable[table] = info.map((column) => column.name);
  }

  await withDatabaseTransaction(db, async (transaction) => {
    for (const table of DELETE_ORDER) {
      await transaction.execAsync(`DELETE FROM ${table}`);
    }
    for (const table of TABLES) {
      const allowedColumns = columnsByTable[table];
      for (const row of backup.tables[table]) {
        const columns = Object.keys(row);
        if (!columns.length || columns.some((column) => !allowedColumns.includes(column))) {
          throw new Error(`Invalid columns in ${table}`);
        }
        const placeholders = columns.map(() => '?').join(', ');
        await transaction.runAsync(
          `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
          columns.map((column) => row[column]),
        );
      }
    }
  });
}

function escapeCsv(value: string | number | null): string {
  const text = value === null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function transactionsToCsv(
  rows: Array<{
    occurredAt: string;
    type: string;
    accountName: string;
    categoryName: string;
    note: string | null;
    amountMinor: number;
    currency: string;
  }>,
): string {
  const header = ['date', 'type', 'account', 'category', 'note', 'amount', 'currency'];
  const lines = rows.map((row) =>
    [
      row.occurredAt,
      row.type,
      row.accountName,
      row.categoryName,
      row.note,
      (row.amountMinor / 100).toFixed(2),
      row.currency,
    ]
      .map(escapeCsv)
      .join(','),
  );
  return [header.join(','), ...lines].join('\n');
}
