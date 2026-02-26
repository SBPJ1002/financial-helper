// ============================================================
// types.ts
// Core types for the classification engine
// ============================================================

export type TransactionType = 'income' | 'fixed_expense' | 'variable_expense';
export type PaymentMethodType = 'pix' | 'boleto' | 'credit_card' | 'debit_card' | 'auto_debit' | 'transfer' | 'other';
export type ClassificationSource = 'user_rule' | 'recurrence' | 'keyword' | 'default' | 'manual';
export type ReviewStatus = 'auto_classified' | 'pending_review' | 'user_confirmed' | 'user_corrected';

// ---- Classifiable transaction (mapped from StdTransaction) ----

export interface ClassifiableTransaction {
  id: string;
  pluggyTransactionId: string;
  stdAccountId: string;
  descriptionClean: string;
  descriptionOriginal: string;
  direction: 'CREDIT' | 'DEBIT';
  absoluteAmount: number;
  date: Date;
  paymentMethod: string;
  counterpartName: string | null;
  counterpartDocument: string | null;
  isSalaryCandidate: boolean;
  installmentNumber: number | null;
  totalInstallments: number | null;
}

// ---- Classification result ----

export interface ClassificationResult {
  transactionType: TransactionType;
  categoryName: string | null;
  source: ClassificationSource;
  confidenceScore: number;
  reviewStatus: ReviewStatus;
  recurrenceGroupId: string | null;
  matchedRuleId: string | null;
  matchedKeywordId: string | null;
}

// ---- User rule ----

export interface UserClassificationRule {
  id: string;
  userId: string;
  matchCounterpartDocument: string | null;
  matchCounterpartName: string | null;
  matchDescriptionContains: string | null;
  matchPaymentMethod: PaymentMethodType | null;
  matchAmountMin: number | null;
  matchAmountMax: number | null;
  transactionType: TransactionType;
  categoryName: string | null;
  customLabel: string | null;
  priority: number;
  isActive: boolean;
}

// ---- Recurrence group ----

export interface RecurrenceGroup {
  id: string;
  userId: string;
  label: string;
  counterpartPattern: string | null;
  amountAvg: number;
  amountTolerance: number;
  dayOfMonthAvg: number | null;
  dayTolerance: number;
  transactionType: TransactionType;
  categoryName: string | null;
  occurrenceCount: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  isActive: boolean;
  confirmedByUser: boolean;
}

// ---- Keyword mapping ----

export interface KeywordMapping {
  id: string;
  keyword: string;
  matchField: 'normalized_description' | 'counterpart_name' | 'raw_description';
  matchType: 'contains' | 'starts_with' | 'exact';
  transactionType: TransactionType;
  categoryName: string | null;
  confidenceBoost: number;
  isActive: boolean;
}
