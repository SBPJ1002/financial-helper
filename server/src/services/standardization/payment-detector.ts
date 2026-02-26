// ============================================================
// payment-detector.ts
// Detects payment method from transaction data and account context
// ============================================================

import { StdPaymentMethod, StdSourceType } from '@prisma/client';

/**
 * Detects the payment method for a transaction based on Pluggy data and account context.
 * Credit accounts always return CREDIT_CARD. Otherwise, checks operationType,
 * Pluggy's paymentMethod field, then falls back to description pattern matching.
 */
export function detectPaymentMethod(
  tx: {
    operationType: string | null;
    description: string;
    paymentMethod: string | null;
  },
  accountSourceType: StdSourceType,
): StdPaymentMethod {
  // Credit accounts are always credit card
  if (accountSourceType === 'CREDIT') return StdPaymentMethod.CREDIT_CARD;

  const descUpper = tx.description.toUpperCase();

  // Check Pluggy's operationType first
  if (tx.operationType === 'PIX' || descUpper.startsWith('PIX ')) return StdPaymentMethod.PIX;

  // Check Pluggy's paymentMethod field
  if (tx.paymentMethod) {
    const pm = tx.paymentMethod.toUpperCase();
    if (pm.includes('PIX')) return StdPaymentMethod.PIX;
    if (pm.includes('BOLETO')) return StdPaymentMethod.BOLETO;
    if (pm.includes('CREDIT')) return StdPaymentMethod.CREDIT_CARD;
    if (pm.includes('DEBIT')) return StdPaymentMethod.DEBIT_CARD;
  }

  // Description-based detection
  if (descUpper.includes('PIX')) return StdPaymentMethod.PIX;
  if (descUpper.includes('BOLETO') || descUpper.includes('TITULO')) return StdPaymentMethod.BOLETO;

  if (
    descUpper.includes('DEB.AUT') ||
    descUpper.includes('DEBITO AUTOMATICO') ||
    descUpper.includes('DEB AUTO')
  ) {
    return StdPaymentMethod.AUTO_DEBIT;
  }

  if (descUpper.includes('COMPRA CARTAO') || descUpper.includes('COMPRA NO DEBITO')) {
    return StdPaymentMethod.DEBIT_CARD;
  }

  if (descUpper.includes('TED') || descUpper.includes('DOC') || descUpper.includes('TRANSF')) {
    return StdPaymentMethod.TRANSFER;
  }

  return StdPaymentMethod.OTHER;
}
