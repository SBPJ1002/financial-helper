// ============================================================
// recurrence-detector.ts
// Detects recurring transaction patterns
// ============================================================

import { ClassifiableTransaction, RecurrenceGroup } from './types.js';
import { fuzzyMatch } from './utils.js';

const MIN_OCCURRENCES = 2;
const AMOUNT_TOLERANCE = 0.15;
const DAY_TOLERANCE = 7;

interface DetectedPattern {
  counterpartKey: string;
  label: string;
  transactions: ClassifiableTransaction[];
  avgAmount: number;
  avgDayOfMonth: number;
  amountVariance: number;
  isIncome: boolean;
}

/**
 * Detects recurrence patterns in a set of transactions.
 */
export function detectRecurrences(
  transactions: ClassifiableTransaction[],
  existingGroups: RecurrenceGroup[] = []
): DetectedPattern[] {
  const grouped = groupByCounterpart(transactions);
  const patterns: DetectedPattern[] = [];

  for (const [key, group] of grouped.entries()) {
    if (group.length < MIN_OCCURRENCES) continue;

    const alreadyTracked = existingGroups.some(
      g => g.isActive && g.counterpartPattern === key
    );
    if (alreadyTracked) continue;

    const debits = group.filter(t => t.direction === 'DEBIT');
    const credits = group.filter(t => t.direction === 'CREDIT');

    if (debits.length >= MIN_OCCURRENCES) {
      const pattern = analyzePattern(key, debits, false);
      if (pattern) patterns.push(pattern);
    }

    if (credits.length >= MIN_OCCURRENCES) {
      const pattern = analyzePattern(key, credits, true);
      if (pattern) patterns.push(pattern);
    }
  }

  return patterns.sort((a, b) => {
    const scoreA = a.transactions.length * (1 - a.amountVariance);
    const scoreB = b.transactions.length * (1 - b.amountVariance);
    return scoreB - scoreA;
  });
}

/**
 * Matches a single transaction to an existing recurrence group
 */
export function matchToRecurrenceGroup(
  transaction: ClassifiableTransaction,
  groups: RecurrenceGroup[]
): RecurrenceGroup | null {
  const txCounterpartKey = buildCounterpartKey(transaction);
  const txAmount = transaction.absoluteAmount;
  const txDay = transaction.date.getDate();

  for (const group of groups) {
    if (!group.isActive) continue;

    const counterpartMatch =
      group.counterpartPattern === txCounterpartKey ||
      (group.counterpartPattern && txCounterpartKey &&
        fuzzyMatch(group.counterpartPattern, txCounterpartKey, 0.8));

    if (!counterpartMatch) continue;

    const avgAmount = Math.abs(group.amountAvg);
    const amountDiff = Math.abs(txAmount - avgAmount) / avgAmount;
    if (amountDiff > group.amountTolerance) continue;

    if (group.dayOfMonthAvg !== null) {
      const dayDiff = Math.abs(txDay - group.dayOfMonthAvg);
      const dayDiffWrapped = Math.min(dayDiff, 30 - dayDiff);
      if (dayDiffWrapped > group.dayTolerance) continue;
    }

    return group;
  }

  return null;
}

// ============================================================
// Internal functions
// ============================================================

function groupByCounterpart(
  transactions: ClassifiableTransaction[]
): Map<string, ClassifiableTransaction[]> {
  const groups = new Map<string, ClassifiableTransaction[]>();

  for (const tx of transactions) {
    const key = buildCounterpartKey(tx);
    if (!key) continue;

    let matchedKey = key;
    for (const existingKey of groups.keys()) {
      if (fuzzyMatch(existingKey, key, 0.8)) {
        matchedKey = existingKey;
        break;
      }
    }

    const existing = groups.get(matchedKey) || [];
    existing.push(tx);
    groups.set(matchedKey, existing);
  }

  return groups;
}

function buildCounterpartKey(tx: ClassifiableTransaction): string | null {
  if (tx.counterpartDocument) {
    return `doc:${tx.counterpartDocument}`;
  }

  if (tx.counterpartName) {
    return `name:${tx.counterpartName.toLowerCase().trim()}`;
  }

  if (tx.descriptionClean) {
    const words = tx.descriptionClean
      .toLowerCase()
      .split(' ')
      .filter(w => w.length > 2)
      .slice(0, 3);

    if (words.length >= 2) {
      return `desc:${words.join(' ')}`;
    }
  }

  return null;
}

function analyzePattern(
  counterpartKey: string,
  transactions: ClassifiableTransaction[],
  isIncome: boolean
): DetectedPattern | null {
  const amounts = transactions.map(t => t.absoluteAmount);
  const days = transactions.map(t => t.date.getDate());

  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const avgDay = Math.round(days.reduce((a, b) => a + b, 0) / days.length);

  const amountVariance = amounts.length > 1
    ? amounts.reduce((sum, a) => sum + Math.pow((a - avgAmount) / avgAmount, 2), 0) / amounts.length
    : 0;

  if (amountVariance > AMOUNT_TOLERANCE * 3) return null;

  const dayVariance = days.length > 1
    ? days.reduce((sum, d) => {
        const diff = Math.abs(d - avgDay);
        return sum + Math.min(diff, 30 - diff);
      }, 0) / days.length
    : 0;

  if (dayVariance > DAY_TOLERANCE) return null;

  const sorted = [...transactions].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const diffDays = Math.round(
      (sorted[i].date.getTime() - sorted[i - 1].date.getTime()) /
      (1000 * 60 * 60 * 24)
    );
    gaps.push(diffDays);
  }

  if (gaps.length > 0) {
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    if (avgGap < 20 || avgGap > 40) return null;
  }

  const label = buildLabel(transactions[0], isIncome);

  return {
    counterpartKey,
    label,
    transactions,
    avgAmount: isIncome ? avgAmount : -avgAmount,
    avgDayOfMonth: avgDay,
    amountVariance,
    isIncome,
  };
}

function buildLabel(sample: ClassifiableTransaction, isIncome: boolean): string {
  const prefix = isIncome ? 'Receita' : 'Gasto';

  if (sample.counterpartName) {
    return `${prefix} - ${sample.counterpartName}`;
  }

  return `${prefix} - ${sample.descriptionClean}`;
}
