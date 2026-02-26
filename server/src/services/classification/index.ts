// ============================================================
// Barrel exports
// ============================================================

export { ClassificationService } from './classification-service.js';
export type { ImportResult } from './classification-service.js';
export { detectRecurrences, matchToRecurrenceGroup } from './recurrence-detector.js';
export { classifyTransaction, classifyBatch, getClassificationStats } from './classifier.js';
export { fuzzyMatch, groupBy, removeAccents } from './utils.js';

export type {
  TransactionType,
  PaymentMethodType,
  ClassificationSource,
  ReviewStatus,
  ClassifiableTransaction,
  ClassificationResult,
  UserClassificationRule,
  RecurrenceGroup,
  KeywordMapping,
} from './types.js';
