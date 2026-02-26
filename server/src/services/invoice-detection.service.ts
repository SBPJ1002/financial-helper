import { prisma } from '../config/prisma.js';

const INVOICE_PATTERNS: RegExp[] = [
  /FATURA/i,
  /PGTO\s*CART/i,
  /PAGAMENTO\s*(DE\s*)?CART/i,
  /PAG\s*FATURA/i,
];

export function isInvoicePattern(description: string, category: string | null): boolean {
  if (category && category.toLowerCase().trim() === 'credit card payment') return true;
  return INVOICE_PATTERNS.some(p => p.test(description));
}

export async function recordInvoicePayment(
  userId: string,
  tx: { id: string; descriptionOriginal: string; absoluteAmount: number; date: Date },
  creditAccounts: Array<{ id: string; accountLabel: string }>,
): Promise<void> {
  const existing = await prisma.invoicePayment.findUnique({
    where: { stdTransactionId: tx.id },
  });
  if (existing) return;

  let stdAccountId = creditAccounts[0]?.id;
  if (!stdAccountId) return;

  // Try to match by card name in description
  for (const acc of creditAccounts) {
    const accNameLower = acc.accountLabel.toLowerCase();
    const descLower = tx.descriptionOriginal.toLowerCase();
    if (descLower.includes(accNameLower) || accNameLower.includes(descLower.split(' ')[0])) {
      stdAccountId = acc.id;
      break;
    }
  }

  const txDate = tx.date instanceof Date ? tx.date : new Date(tx.date);
  const month = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;

  await prisma.invoicePayment.create({
    data: {
      userId,
      stdTransactionId: tx.id,
      stdAccountId,
      amount: tx.absoluteAmount,
      month,
      detectedDescription: tx.descriptionOriginal,
    },
  });
}
