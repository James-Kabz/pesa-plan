import type {
  Category,
  FinanceTransaction,
  TransactionType,
} from './types';

export interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  confidence: number;
  matchCount: number;
  reason: 'same_description' | 'similar_description';
}

const IGNORED_WORDS = new Set([
  'a',
  'an',
  'and',
  'at',
  'for',
  'from',
  'food',
  'groceries',
  'in',
  'of',
  'on',
  'paid',
  'payment',
  'purchase',
  'shop',
  'store',
  'the',
  'to',
  'via',
  'weekly',
]);

export function normalizeDescription(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function descriptionTokens(value: string): Set<string> {
  return new Set(
    normalizeDescription(value)
      .split(' ')
      .filter((token) => token.length >= 2 && !IGNORED_WORDS.has(token)),
  );
}

function chooseUnambiguous(
  scores: Map<string, { score: number; matches: number; maxSimilarity: number }>,
): { categoryId: string; score: number; matches: number; maxSimilarity: number; confidence: number } | null {
  const ranked = [...scores.entries()]
    .map(([categoryId, value]) => ({ categoryId, ...value }))
    .sort((a, b) => b.score - a.score || b.matches - a.matches);
  const top = ranked[0];
  if (!top) return null;
  const second = ranked[1];
  if (second && top.score - second.score < 0.2) return null;
  const total = ranked.reduce((sum, item) => sum + item.score, 0);
  return { ...top, confidence: total ? top.score / total : 0 };
}

export function suggestCategory(
  description: string,
  transactions: FinanceTransaction[],
  categories: Category[],
  type: TransactionType,
): CategorySuggestion | null {
  const normalized = normalizeDescription(description);
  if (normalized.length < 2) return null;
  const validCategories = new Map(
    categories
      .filter((category) => category.type === type)
      .map((category) => [category.id, category]),
  );
  const history = transactions.filter(
    (transaction) =>
      transaction.type === type &&
      transaction.note &&
      validCategories.has(transaction.categoryId),
  );

  const exactScores = new Map<
    string,
    { score: number; matches: number; maxSimilarity: number }
  >();
  for (const transaction of history) {
    if (normalizeDescription(transaction.note ?? '') !== normalized) continue;
    const current = exactScores.get(transaction.categoryId) ?? {
      score: 0,
      matches: 0,
      maxSimilarity: 1,
    };
    current.score += 1;
    current.matches += 1;
    exactScores.set(transaction.categoryId, current);
  }
  const exact = chooseUnambiguous(exactScores);
  if (exact && exact.confidence >= 0.6) {
    const category = validCategories.get(exact.categoryId)!;
    return {
      categoryId: category.id,
      categoryName: category.name,
      categoryIcon: category.icon,
      categoryColor: category.color,
      confidence: exact.confidence,
      matchCount: exact.matches,
      reason: 'same_description',
    };
  }

  const currentTokens = descriptionTokens(description);
  if (!currentTokens.size) return null;
  const similarScores = new Map<
    string,
    { score: number; matches: number; maxSimilarity: number }
  >();
  for (const transaction of history) {
    const previousTokens = descriptionTokens(transaction.note ?? '');
    if (!previousTokens.size) continue;
    const overlap = [...currentTokens].filter((token) => previousTokens.has(token)).length;
    if (!overlap) continue;
    const containment = overlap / Math.min(currentTokens.size, previousTokens.size);
    const union = new Set([...currentTokens, ...previousTokens]).size;
    const jaccard = overlap / union;
    const similarity = containment * 0.7 + jaccard * 0.3;
    if (similarity < 0.65) continue;
    const current = similarScores.get(transaction.categoryId) ?? {
      score: 0,
      matches: 0,
      maxSimilarity: 0,
    };
    current.score += similarity;
    current.matches += 1;
    current.maxSimilarity = Math.max(current.maxSimilarity, similarity);
    similarScores.set(transaction.categoryId, current);
  }
  const similar = chooseUnambiguous(similarScores);
  if (!similar || similar.maxSimilarity < 0.65 || similar.confidence < 0.6) return null;
  const category = validCategories.get(similar.categoryId)!;
  return {
    categoryId: category.id,
    categoryName: category.name,
    categoryIcon: category.icon,
    categoryColor: category.color,
    confidence: similar.confidence,
    matchCount: similar.matches,
    reason: 'similar_description',
  };
}
