import type {
  Account,
  Category,
  FinanceTransaction,
  TransactionType,
} from './types';

export interface FastEntryDefaults {
  accountId: string;
  categoryId: string;
}

function recentForType(
  transactions: FinanceTransaction[],
  type: TransactionType,
): FinanceTransaction[] {
  return transactions.filter((transaction) => transaction.type === type);
}

export function getFastEntryDefaults(
  transactions: FinanceTransaction[],
  accounts: Account[],
  categories: Category[],
  type: TransactionType,
): FastEntryDefaults {
  const recent = recentForType(transactions, type);
  const accountIds = new Set(accounts.map((account) => account.id));
  const categoryIds = new Set(
    categories.filter((category) => category.type === type).map((category) => category.id),
  );
  return {
    accountId:
      recent.find((transaction) => accountIds.has(transaction.accountId))?.accountId ??
      accounts[0]?.id ??
      '',
    categoryId:
      recent.find((transaction) => categoryIds.has(transaction.categoryId))?.categoryId ??
      categories.find((category) => category.type === type)?.id ??
      '',
  };
}

export function getRecentTemplates(
  transactions: FinanceTransaction[],
  type: TransactionType,
  limit = 4,
): FinanceTransaction[] {
  const seen = new Set<string>();
  const templates: FinanceTransaction[] = [];
  for (const transaction of recentForType(transactions, type)) {
    const signature = [
      transaction.accountId,
      transaction.categoryId,
      transaction.amountMinor,
      transaction.note?.trim().toLowerCase() ?? '',
    ].join('|');
    if (seen.has(signature)) continue;
    seen.add(signature);
    templates.push(transaction);
    if (templates.length === limit) break;
  }
  return templates;
}

export function getRecentAmounts(
  transactions: FinanceTransaction[],
  type: TransactionType,
  accountId: string,
  limit = 3,
): number[] {
  const seen = new Set<number>();
  const amounts: number[] = [];
  for (const transaction of recentForType(transactions, type)) {
    if (accountId && transaction.accountId !== accountId) continue;
    if (seen.has(transaction.amountMinor)) continue;
    seen.add(transaction.amountMinor);
    amounts.push(transaction.amountMinor);
    if (amounts.length === limit) break;
  }
  return amounts;
}

function recentIds(
  transactions: FinanceTransaction[],
  type: TransactionType,
  field: 'accountId' | 'categoryId',
): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const transaction of recentForType(transactions, type)) {
    const id = transaction[field];
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

export function orderAccountsForEntry(
  accounts: Account[],
  transactions: FinanceTransaction[],
  type: TransactionType,
): Account[] {
  const position = new Map(
    recentIds(transactions, type, 'accountId').map((id, index) => [id, index]),
  );
  return [...accounts].sort(
    (a, b) =>
      (position.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (position.get(b.id) ?? Number.MAX_SAFE_INTEGER),
  );
}

export function orderCategoriesForEntry(
  categories: Category[],
  transactions: FinanceTransaction[],
  type: TransactionType,
): Category[] {
  const position = new Map(
    recentIds(transactions, type, 'categoryId').map((id, index) => [id, index]),
  );
  return categories
    .filter((category) => category.type === type)
    .sort(
      (a, b) =>
        (position.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
          (position.get(b.id) ?? Number.MAX_SAFE_INTEGER) ||
        a.name.localeCompare(b.name),
    );
}
