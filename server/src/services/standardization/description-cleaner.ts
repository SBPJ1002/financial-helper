// ============================================================
// description-cleaner.ts
// Cleans and normalizes transaction descriptions
// ============================================================

const BANK_CODE_PATTERNS = [
  /\b\d{6,}\b/g,                          // long number sequences
  /\b[A-F0-9]{8,}\b/gi,                   // hex hashes
  /\s*-\s*\d+\s*$/,                        // " - 12345" at end
  /^\d{2}\/\d{2}\s*/,                      // "05/01 " at start (date)
  /\bNSU:\s*\d+/gi,                        // NSU: 123456
  /\bAUT:\s*\d+/gi,                        // AUT: 123456
  /\bDOC:\s*\d+/gi,                        // DOC: 123456
  /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/, // CNPJ inline
  /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/,        // CPF inline
  /\b\d{2}\/\d{2}\/\d{4}\b/g,             // date DD/MM/YYYY
  /\b\d{4}-\d{2}-\d{2}\b/g,               // date YYYY-MM-DD
];

const BANK_PREFIXES = [
  /^PAG\*/i,
  /^PGTO\s*/i,
  /^RECTO?\s*/i,
  /^TED\s*/i,
  /^DOC\s*/i,
  /^PIX\s*/i,
  /^DEB\.AUT\.\s*/i,
  /^TRANSF\s*/i,
  /^COMPRA\s+CARTAO\s*/i,
  /^PAGAMENTO\s+EFETUADO\s*/i,
  /^Pix\s+enviado\s+para\s*/i,
  /^Pix\s+recebido\s+de\s*/i,
  /^Pagamento\s+para\s*/i,
  /^TED\s+recebida\s+de\s*/i,
  /^COMPRA\s+NO\s+DEBITO\s*/i,
  /^DEBITO\s+AUTOMATICO\s*/i,
];

/**
 * Cleans a transaction description by removing bank codes, prefixes, noise,
 * and normalizing casing. Falls back to descriptionRaw if result is too short.
 */
export function cleanDescription(description: string, descriptionRaw?: string | null): string {
  let cleaned = description;

  // Remove bank code patterns
  for (const pattern of BANK_CODE_PATTERNS) {
    cleaned = cleaned.replace(pattern, ' ');
  }

  // Remove bank prefixes
  for (const prefix of BANK_PREFIXES) {
    cleaned = cleaned.replace(prefix, '');
  }

  // Remove processor codes (e.g. "DL*GOOGLE YOUTUB" → "GOOGLE YOUTUB")
  if (cleaned.includes('*')) {
    const parts = cleaned.split('*');
    const after = parts.slice(1).join('*').trim();
    if (after.length >= 3 && !/^pending$/i.test(after)) {
      cleaned = after;
    } else {
      cleaned = parts[0].trim();
    }
  }

  // Clean up whitespace and special chars
  cleaned = cleaned
    .replace(/[#]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If result is too short, try descriptionRaw
  if (cleaned.length < 3 && descriptionRaw) {
    let rawCleaned = descriptionRaw;
    for (const prefix of BANK_PREFIXES) {
      rawCleaned = rawCleaned.replace(prefix, '');
    }
    rawCleaned = rawCleaned.replace(/\s+/g, ' ').trim();
    if (rawCleaned.length >= cleaned.length) {
      cleaned = rawCleaned;
    }
  }

  // Title-case: capitalize first letter of words longer than 2 chars
  cleaned = cleaned
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (word.length <= 2) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');

  return cleaned || description;
}
