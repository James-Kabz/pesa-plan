import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-crypto', () => ({
  getRandomBytesAsync: async (length: number) => new Uint8Array(length).fill(7),
}));

import {
  decryptBackup,
  encryptBackup,
  parseBackup,
  transactionsToCsv,
  type PesaPlanBackup,
} from './backup';

const backup: PesaPlanBackup = {
  format: 'pesa-plan-backup',
  version: 1,
  createdAt: '2026-07-24T00:00:00.000Z',
  tables: { accounts: [{ id: 'cash', name: 'Cash' }] },
};

describe('encrypted backups', () => {
  it('round-trips with the correct password', async () => {
    const encrypted = await encryptBackup(backup, 'strong-password');
    expect(encrypted).not.toContain('"Cash"');
    await expect(decryptBackup(encrypted, 'strong-password')).resolves.toEqual(backup);
  });

  it('rejects a wrong password and unsupported files', async () => {
    const encrypted = await encryptBackup(backup, 'strong-password');
    await expect(decryptBackup(encrypted, 'wrong-password')).rejects.toThrow();
    expect(() => parseBackup('{"format":"unknown"}')).toThrow();
  });
});

describe('CSV export', () => {
  it('quotes commas and double quotes safely', () => {
    const csv = transactionsToCsv([
      {
        occurredAt: '2026-07-24',
        type: 'expense',
        accountName: 'Main, bank',
        categoryName: 'Food',
        note: 'Lunch "special"',
        amountMinor: 125050,
        currency: 'KES',
      },
    ]);
    expect(csv).toContain('"Main, bank"');
    expect(csv).toContain('"Lunch ""special"""');
    expect(csv).toContain('"1250.50"');
  });
});
