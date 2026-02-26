// ============================================================
// classifier.ts
// Main classification engine — orchestrates the 3 layers
// ============================================================

import {
  ClassifiableTransaction,
  ClassificationResult,
  UserClassificationRule,
  RecurrenceGroup,
  KeywordMapping,
  ClassificationSource,
} from './types.js';
import { matchToRecurrenceGroup } from './recurrence-detector.js';
import { fuzzyMatch } from './utils.js';

const AUTO_CLASSIFY_THRESHOLD = 0.80;

/**
 * Classifies a transaction through 3 layers:
 * 1. User Rules (confidence 0.95)
 * 2. Recurrence Detection (confidence 0.60-0.85)
 * 3. Keyword Heuristics (confidence 0.50-0.80)
 * 4. Fallback: direction-based
 */
export function classifyTransaction(
  transaction: ClassifiableTransaction,
  userRules: UserClassificationRule[],
  recurrenceGroups: RecurrenceGroup[],
  keywordMappings: KeywordMapping[]
): ClassificationResult {

  // Layer 1: User Rules
  const ruleMatch = matchUserRule(transaction, userRules);
  if (ruleMatch) {
    return {
      transactionType: ruleMatch.rule.transactionType,
      categoryName: ruleMatch.rule.categoryName,
      source: 'user_rule',
      confidenceScore: 0.95,
      reviewStatus: 'auto_classified',
      recurrenceGroupId: null,
      matchedRuleId: ruleMatch.rule.id,
      matchedKeywordId: null,
    };
  }

  // Layer 2: Recurrence
  const recurrenceMatch = matchToRecurrenceGroup(transaction, recurrenceGroups);
  if (recurrenceMatch) {
    const confidence = calculateRecurrenceConfidence(recurrenceMatch);
    return {
      transactionType: recurrenceMatch.transactionType as any,
      categoryName: recurrenceMatch.categoryName,
      source: 'recurrence',
      confidenceScore: confidence,
      reviewStatus: confidence >= AUTO_CLASSIFY_THRESHOLD
        ? 'auto_classified'
        : 'pending_review',
      recurrenceGroupId: recurrenceMatch.id,
      matchedRuleId: null,
      matchedKeywordId: null,
    };
  }

  // Layer 3: Keywords / Heuristics
  const keywordMatch = matchKeyword(transaction, keywordMappings);
  if (keywordMatch) {
    let confidence = keywordMatch.mapping.confidenceBoost;

    // Boost salary keyword confidence if isSalaryCandidate flag is set
    if (transaction.isSalaryCandidate && keywordMatch.mapping.transactionType === 'income') {
      confidence = Math.min(confidence + 0.15, 0.95);
    }

    return {
      transactionType: keywordMatch.mapping.transactionType,
      categoryName: keywordMatch.mapping.categoryName,
      source: 'keyword',
      confidenceScore: confidence,
      reviewStatus: confidence >= AUTO_CLASSIFY_THRESHOLD
        ? 'auto_classified'
        : 'pending_review',
      recurrenceGroupId: null,
      matchedRuleId: null,
      matchedKeywordId: keywordMatch.mapping.id,
    };
  }

  // Layer 4: Fallback by direction
  return classifyByDirection(transaction);
}

export function classifyBatch(
  transactions: ClassifiableTransaction[],
  userRules: UserClassificationRule[],
  recurrenceGroups: RecurrenceGroup[],
  keywordMappings: KeywordMapping[]
): Map<string, ClassificationResult> {
  const results = new Map<string, ClassificationResult>();

  for (const tx of transactions) {
    const result = classifyTransaction(tx, userRules, recurrenceGroups, keywordMappings);
    results.set(tx.id, result);
  }

  return results;
}

export function getClassificationStats(results: Map<string, ClassificationResult>) {
  let autoClassified = 0;
  let pendingReview = 0;
  let income = 0;
  let fixedExpense = 0;
  let variableExpense = 0;
  const bySource: Record<ClassificationSource, number> = {
    user_rule: 0,
    recurrence: 0,
    keyword: 0,
    default: 0,
    manual: 0,
  };

  for (const result of results.values()) {
    if (result.reviewStatus === 'auto_classified') autoClassified++;
    if (result.reviewStatus === 'pending_review') pendingReview++;
    if (result.transactionType === 'income') income++;
    if (result.transactionType === 'fixed_expense') fixedExpense++;
    if (result.transactionType === 'variable_expense') variableExpense++;
    bySource[result.source]++;
  }

  return {
    total: results.size,
    autoClassified,
    pendingReview,
    byType: { income, fixedExpense, variableExpense },
    bySource,
  };
}

// ============================================================
// Match functions
// ============================================================

function matchUserRule(
  tx: ClassifiableTransaction,
  rules: UserClassificationRule[]
): { rule: UserClassificationRule } | null {
  const sortedRules = [...rules]
    .filter(r => r.isActive)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    if (doesRuleMatch(tx, rule)) {
      return { rule };
    }
  }

  return null;
}

function doesRuleMatch(
  tx: ClassifiableTransaction,
  rule: UserClassificationRule
): boolean {
  if (rule.matchCounterpartDocument) {
    if (tx.counterpartDocument !== rule.matchCounterpartDocument) return false;
  }

  if (rule.matchCounterpartName) {
    if (!tx.counterpartName) return false;
    if (!fuzzyMatch(rule.matchCounterpartName, tx.counterpartName, 0.75)) return false;
  }

  if (rule.matchDescriptionContains) {
    const keyword = rule.matchDescriptionContains.toLowerCase();
    const desc = tx.descriptionClean.toLowerCase();
    const raw = tx.descriptionOriginal.toLowerCase();
    if (!desc.includes(keyword) && !raw.includes(keyword)) return false;
  }

  if (rule.matchPaymentMethod) {
    const txMethod = mapStdPaymentToEngine(tx.paymentMethod);
    if (txMethod !== rule.matchPaymentMethod) return false;
  }

  if (rule.matchAmountMin !== null) {
    if (tx.absoluteAmount < rule.matchAmountMin) return false;
  }

  if (rule.matchAmountMax !== null) {
    if (tx.absoluteAmount > rule.matchAmountMax) return false;
  }

  return true;
}

function matchKeyword(
  tx: ClassifiableTransaction,
  mappings: KeywordMapping[]
): { mapping: KeywordMapping } | null {
  const sorted = [...mappings]
    .filter(m => m.isActive)
    .sort((a, b) => b.confidenceBoost - a.confidenceBoost);

  for (const mapping of sorted) {
    const fieldValue = getFieldValue(tx, mapping.matchField);
    if (!fieldValue) continue;

    const keyword = mapping.keyword.toLowerCase();
    const value = fieldValue.toLowerCase();

    let matched = false;
    switch (mapping.matchType) {
      case 'exact':
        matched = value === keyword;
        break;
      case 'starts_with':
        matched = value.startsWith(keyword);
        break;
      case 'contains':
      default:
        matched = value.includes(keyword);
        break;
    }

    if (matched) {
      return { mapping };
    }
  }

  return null;
}

function getFieldValue(
  tx: ClassifiableTransaction,
  field: string
): string | null {
  switch (field) {
    case 'normalized_description':
      return tx.descriptionClean;
    case 'counterpart_name':
      return tx.counterpartName;
    case 'raw_description':
      return tx.descriptionOriginal;
    default:
      return null;
  }
}

function calculateRecurrenceConfidence(group: RecurrenceGroup): number {
  let confidence = 0.60;

  if (group.occurrenceCount >= 6) confidence += 0.20;
  else if (group.occurrenceCount >= 3) confidence += 0.15;
  else confidence += 0.05;

  if (group.confirmedByUser) confidence += 0.15;

  return Math.min(confidence, 0.95);
}

function classifyByDirection(tx: ClassifiableTransaction): ClassificationResult {
  const isIncome = tx.direction === 'CREDIT';

  return {
    transactionType: isIncome ? 'income' : 'variable_expense',
    categoryName: null,
    source: 'default',
    confidenceScore: isIncome ? 0.40 : 0.20,
    reviewStatus: 'pending_review',
    recurrenceGroupId: null,
    matchedRuleId: null,
    matchedKeywordId: null,
  };
}

function mapStdPaymentToEngine(stdMethod: string): string {
  const map: Record<string, string> = {
    PIX: 'pix',
    BOLETO: 'boleto',
    CREDIT_CARD: 'credit_card',
    DEBIT_CARD: 'debit_card',
    AUTO_DEBIT: 'auto_debit',
    TRANSFER: 'transfer',
    CASH: 'other',
    OTHER: 'other',
  };
  return map[stdMethod] || 'other';
}
