// ============================================================
// counterpart-resolver.ts
// Extracts and deduplicates counterpart (payee/payer) information
// ============================================================

import { PrismaClient, DocumentType } from '@prisma/client';

export interface ExtractedCounterpart {
  name: string | null;
  document: string | null;
  documentType: DocumentType | null;
  mccCode: string | null;
}

/**
 * Extracts counterpart info from a PluggyTransaction.
 * Priority: merchant > receiver/payer > description parsing.
 */
export function extractCounterpart(tx: {
  merchantName: string | null;
  merchantBusinessName: string | null;
  merchantCnpj: string | null;
  merchantCategoryCode: string | null;
  receiverName: string | null;
  receiverDocType: string | null;
  receiverDocValue: string | null;
  payerName: string | null;
  payerDocType: string | null;
  payerDocValue: string | null;
  amount: number;
  description: string;
}): ExtractedCounterpart {
  // 1. Merchant info (highest priority)
  if (tx.merchantCnpj || tx.merchantName) {
    return {
      name: tx.merchantBusinessName || tx.merchantName || null,
      document: tx.merchantCnpj ? cleanDocument(tx.merchantCnpj) : null,
      documentType: tx.merchantCnpj ? DocumentType.CNPJ : null,
      mccCode: tx.merchantCategoryCode || null,
    };
  }

  // 2. Receiver/Payer (depends on transaction direction)
  // Negative amount = debit (we paid someone = receiver is counterpart)
  // Positive amount = credit (someone paid us = payer is counterpart)
  const isDebit = tx.amount < 0;
  const relevantName = isDebit ? tx.receiverName : tx.payerName;
  const relevantDocType = isDebit ? tx.receiverDocType : tx.payerDocType;
  const relevantDocValue = isDebit ? tx.receiverDocValue : tx.payerDocValue;

  if (relevantDocValue || relevantName) {
    const docType = parseDocType(relevantDocType, relevantDocValue);
    return {
      name: relevantName ? normalizeName(relevantName) : null,
      document: relevantDocValue ? cleanDocument(relevantDocValue) : null,
      documentType: docType,
      mccCode: null,
    };
  }

  // 3. Fallback: parse from description
  return extractFromDescription(tx.description);
}

/**
 * Upserts a StdCounterpart record, deduplicating by userId + document.
 * Returns the counterpart ID if a document was found.
 */
export async function resolveCounterpart(
  prisma: PrismaClient,
  userId: string,
  extracted: ExtractedCounterpart,
  absoluteAmount: number,
): Promise<string | null> {
  if (!extracted.document || !extracted.documentType) return null;

  const existing = await prisma.stdCounterpart.findUnique({
    where: { userId_document: { userId, document: extracted.document } },
  });

  if (existing) {
    const newRawNames = extracted.name && !existing.rawNames.includes(extracted.name)
      ? [...existing.rawNames, extracted.name]
      : existing.rawNames;

    const newCount = existing.transactionCount + 1;
    const newAvg = (existing.avgAmount * existing.transactionCount + absoluteAmount) / newCount;

    await prisma.stdCounterpart.update({
      where: { id: existing.id },
      data: {
        rawNames: newRawNames,
        displayName: extracted.name || existing.displayName,
        transactionCount: newCount,
        avgAmount: newAvg,
        mccCode: extracted.mccCode || existing.mccCode,
      },
    });
    return existing.id;
  }

  const created = await prisma.stdCounterpart.create({
    data: {
      userId,
      document: extracted.document,
      documentType: extracted.documentType,
      displayName: extracted.name || extracted.document,
      rawNames: extracted.name ? [extracted.name] : [],
      mccCode: extracted.mccCode,
      transactionCount: 1,
      avgAmount: absoluteAmount,
    },
  });

  return created.id;
}

// ============================================================
// Internal helpers
// ============================================================

function cleanDocument(doc: string): string {
  return doc.replace(/[.\-\/]/g, '');
}

function parseDocType(
  docType: string | null,
  docValue: string | null,
): DocumentType | null {
  if (docType) {
    const upper = docType.toUpperCase();
    if (upper === 'CPF') return DocumentType.CPF;
    if (upper === 'CNPJ') return DocumentType.CNPJ;
  }

  if (docValue) {
    const cleaned = cleanDocument(docValue);
    if (cleaned.length === 11) return DocumentType.CPF;
    if (cleaned.length === 14) return DocumentType.CNPJ;
  }

  return null;
}

function normalizeName(name: string): string {
  return name
    .replace(/[*#]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function extractFromDescription(description: string): ExtractedCounterpart {
  // Try to extract CNPJ
  const cnpjMatch = description.match(/(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/);
  if (cnpjMatch) {
    return {
      name: extractNameFromDesc(description),
      document: cleanDocument(cnpjMatch[1]),
      documentType: DocumentType.CNPJ,
      mccCode: null,
    };
  }

  // Try to extract CPF
  const cpfMatch = description.match(/(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/);
  if (cpfMatch) {
    return {
      name: extractNameFromDesc(description),
      document: cleanDocument(cpfMatch[1]),
      documentType: DocumentType.CPF,
      mccCode: null,
    };
  }

  return {
    name: extractNameFromDesc(description),
    document: null,
    documentType: null,
    mccCode: null,
  };
}

function extractNameFromDesc(description: string): string | null {
  const descClean = description
    .replace(/^(PAG\*|PIX\s|TED\s|TRANSF\s|Pix enviado para\s+|Pix recebido de\s+|Pagamento para\s+|TED recebida de\s+)/i, '')
    .trim();

  let name = descClean;
  if (name.includes('*')) {
    const parts = name.split('*');
    const after = parts.slice(1).join('*').trim();
    if (after.length >= 3) name = after;
  }

  name = name.replace(/\s*-\s*\d+.*$/, '').trim();

  const words = name.split(/\s+/);
  if (words.length >= 2 && !/\d{4,}/.test(name)) {
    return normalizeName(name.split(/\s*-\s*/)[0].trim());
  }

  if (words.length === 1 && words[0].length >= 3 && !/^\d+$/.test(words[0])) {
    return normalizeName(words[0]);
  }

  return null;
}
