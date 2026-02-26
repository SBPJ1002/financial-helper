// ============================================================
// flag-detector.ts
// Detects transaction flags: internal transfers, invoice payments, refunds, salary
// ============================================================

import { StdSourceType } from '@prisma/client';

export interface TransactionFlags {
  isInternalTransfer: boolean;
  isInvoicePayment: boolean;
  isRefund: boolean;
  isSalaryCandidate: boolean;
}

// Categories from Pluggy that indicate internal/non-expense transactions
const SKIP_CATEGORIES = new Set([
  'same person transfer',
  'credit card payment',
  'automatic investment',
]);

const INTERNAL_TRANSFER_PATTERNS: RegExp[] = [
  /TRANSFER[EÊ]NCIA\s+(ENVIADA|RECEBIDA)\s+(PARA|DA)\s+(A\s+)?CONTA/i,
  /MESMA\s+TITULARIDADE/i,
  /ENTRE\s+CONTAS/i,
  /CONTA\s+INVESTIMENTO/i,
  /RESGATE\s+AUTOM[AÁ]TICO/i,
  /RENDIMENTO\s+AUTOM[AÁ]TICO/i,
  /\bCDB\b/i,
  /\bRDB\b/i,
  /\bLCI\b/i,
  /\bLCA\b/i,
  /TESOURO\s+(SELIC|IPCA|PREFIXADO|DIRETO|RENDA|EDUCA|RESERVA)/i,
  /APLIC(A[CÇ][AÃ]O)?\s+(FINANCEIRA|RENDA\s*FIXA|FUNDO)/i,
  /APLIC\s*AUT/i,
  /FUNDO\s*(DE\s+)?INVESTIMENTO/i,
  /POUPAN[CÇ]A/i,
];

const INTERNAL_OPERATION_TYPES = new Set([
  'RENDIMENTO_APLIC_FINANCEIRA',
  'RESGATE_APLIC_FINANCEIRA',
  'TRANSFERENCIA_MESMA_INSTITUICAO',
]);

const INVOICE_PAYMENT_PATTERNS: RegExp[] = [
  /FATURA/i,
  /PGTO\s*CART/i,
  /PAGAMENTO\s*(DE\s*)?CART/i,
  /PAG\s*FATURA/i,
  /PAGAMENTO\s+DE\s+FATURA/i,
];

const REFUND_PATTERNS: RegExp[] = [
  /ESTORNO/i,
  /DEVOLU[CÇ][AÃ]O/i,
  /REFUND/i,
  /CHARGEBACK/i,
  /CANCELAMENTO/i,
];

const SALARY_PATTERNS: RegExp[] = [
  /SAL[AÁ]RIO/i,
  /SALARY/i,
  /PAGAMENTO/i,
  /FOLHA/i,
  /REMUNERA[CÇ][AÃ]O/i,
  /PROVENTOS/i,
  /BENEFICIO/i,
  /BENEF[IÍ]CIO/i,
];

/**
 * Detects transaction flags based on description, category, operationType, and account context.
 */
export function detectFlags(
  tx: {
    description: string;
    category: string | null;
    operationType: string | null;
    amount: number;
  },
  accountSourceType: StdSourceType,
): TransactionFlags {
  const description = tx.description;
  const category = tx.category;
  const operationType = tx.operationType;

  // Internal transfer detection
  const isInternalTransfer =
    (category != null && SKIP_CATEGORIES.has(category.toLowerCase().trim()) && category.toLowerCase().trim() !== 'credit card payment') ||
    (operationType != null && INTERNAL_OPERATION_TYPES.has(operationType)) ||
    INTERNAL_TRANSFER_PATTERNS.some(p => p.test(description));

  // Invoice payment detection (credit card payment from checking account)
  const isInvoicePayment =
    (category != null && category.toLowerCase().trim() === 'credit card payment') ||
    (accountSourceType === 'BANK' && INVOICE_PAYMENT_PATTERNS.some(p => p.test(description)));

  // Refund detection
  const isRefund = tx.amount > 0 && REFUND_PATTERNS.some(p => p.test(description));

  // Salary candidate detection (positive amount + salary keywords)
  const isSalaryCandidate = tx.amount > 0 && SALARY_PATTERNS.some(p => p.test(description));

  return { isInternalTransfer, isInvoicePayment, isRefund, isSalaryCandidate };
}
