import type { SQLiteDatabase } from 'expo-sqlite';

export async function withDatabaseTransaction(
  db: SQLiteDatabase,
  task: (transaction: SQLiteDatabase) => Promise<void>,
): Promise<void> {
  await db.withExclusiveTransactionAsync(task);
}
