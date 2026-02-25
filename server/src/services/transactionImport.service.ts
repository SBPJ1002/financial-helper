import { prisma } from '../config/prisma.js';

// --- Pluggy Category → App Category Mapping ---
// Pluggy sends categories in English. We map them to our app categories.

const CATEGORY_MAP: Record<string, string> = {
  // Food
  'eating out': 'Food',
  'groceries': 'Food',
  'food delivery': 'Food',
  'bakery': 'Food',

  // Transport
  'taxi and ride-hailing': 'Transport',
  'gas': 'Transport',
  'public transportation': 'Transport',
  'parking': 'Transport',
  'toll': 'Transport',

  // Health
  'pharmacy': 'Health',
  'health': 'Health',
  'medical': 'Health',

  // Education
  'school': 'Education',
  'bookstore': 'Education',
  'education': 'Education',

  // Entertainment
  'tickets': 'Entertainment',
  'entertainment': 'Entertainment',
  'sports goods': 'Entertainment',
  'travel': 'Entertainment',

  // Housing
  'housing': 'Housing',
  'houseware': 'Housing',
  'internet': 'Housing',

  // Services & Subscriptions
  'digital services': 'Services',
  'services': 'Services',
  'insurance': 'Services',
  'office supplies': 'Services',

  // Shopping
  'shopping': 'Personal',
  'online shopping': 'Personal',
  'electronics': 'Personal',
  'kids and toys': 'Personal',

  // Other
  'donations': 'Other',
  'tax on financial operations': 'Other',

  // Transfers/PIX that pass through skip filter are real payments
  'transfers': 'Services',
  'transfer - pix': 'Services',
  'transfer - ted': 'Services',
};

function mapCategory(pluggyCategory: string | null, description: string = ''): string {
  if (!pluggyCategory) return 'Other';
  const lower = pluggyCategory.toLowerCase().trim();

  // Direct match first
  if (CATEGORY_MAP[lower]) return CATEGORY_MAP[lower];

  // Partial match fallback
  for (const [keyword, appCategory] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(keyword)) return appCategory;
  }
  return 'Other';
}

// --- Skip Categories (Pluggy English categories that are NOT real expenses/income) ---

const SKIP_CATEGORIES = new Set([
  'same person transfer',      // Internal transfer between own accounts
  'credit card payment',       // Paying credit card bill (already counted as individual charges)
  'automatic investment',      // Investment operations (already from /investments endpoint)
]);

// --- Skip by description (fallback for when category is missing) ---

const SKIP_DESCRIPTION_PATTERNS: RegExp[] = [
  // Internal transfers
  /TRANSFER[EÊ]NCIA\s+(ENVIADA|RECEBIDA)\s+(PARA|DA)\s+(A\s+)?CONTA/i,
  /MESMA\s+TITULARIDADE/i,
  /ENTRE\s+CONTAS/i,
  /CONTA\s+INVESTIMENTO/i,
  /RESGATE\s+AUTOM[AÁ]TICO/i,
  /RENDIMENTO\s+AUTOM[AÁ]TICO/i,
  /PAGAMENTO\s+DE\s+FATURA/i,

  // Investment operations
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

const SKIP_OPERATION_TYPES = new Set([
  'RENDIMENTO_APLIC_FINANCEIRA',
  'RESGATE_APLIC_FINANCEIRA',
  'TRANSFERENCIA_MESMA_INSTITUICAO',
]);

function shouldSkipTransaction(
  description: string,
  category: string | null,
  operationType: string | null,
): boolean {
  // 1. Skip by Pluggy category (most reliable — comes from Open Finance classification)
  if (category && SKIP_CATEGORIES.has(category.toLowerCase().trim())) return true;

  // 2. Skip by operationType
  if (operationType && SKIP_OPERATION_TYPES.has(operationType)) return true;

  // 3. Skip by description patterns (fallback)
  return SKIP_DESCRIPTION_PATTERNS.some(p => p.test(description));
}

// --- Description Cleanup ---

function cleanDescription(desc: string): string {
  let cleaned = desc;

  // Remove transfer/payment prefixes
  cleaned = cleaned
    .replace(/^Pix enviado para\s+/i, '')
    .replace(/^Pix recebido de\s+/i, '')
    .replace(/^Pagamento para\s+/i, '')
    .replace(/^TED recebida de\s+/i, '');

  // For "*" patterns (e.g. "DL*GOOGLE YOUTUB", "IFD*IFOOD CLUB"):
  // Remove processor code before *, keep merchant name after
  if (cleaned.includes('*')) {
    const parts = cleaned.split('*');
    const after = parts.slice(1).join('*').trim();
    // If what's after * is meaningful, use it; otherwise keep what's before
    if (after.length >= 3 && !/^pending$/i.test(after)) {
      cleaned = after;
    } else {
      cleaned = parts[0].trim();
    }
  }

  // Collapse multiple spaces and trim
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

  return cleaned || desc;
}

// --- Payment Method Detection ---

function detectPaymentMethod(
  operationType: string | null,
  accountType: string,
  accountName: string,
): 'PIX' | 'CREDIT' | 'DEBIT' {
  if (operationType === 'PIX') return 'PIX';

  // Credit card accounts (Pluggy type "CREDIT" or "CREDIT_CARD")
  if (accountType === 'CREDIT' || accountType === 'CREDIT_CARD') return 'CREDIT';

  // Account name contains card brand indicators → credit
  const nameLower = accountName.toLowerCase();
  if (nameLower.includes('visa') || nameLower.includes('master') || nameLower.includes('cartão') || nameLower.includes('cartao')) {
    return 'CREDIT';
  }

  return 'DEBIT';
}

// --- Recurrence Detection ---
// A transaction is "recurring" if the same normalized description appears in 2+ distinct months
// (lowered from 3 to 2 since we only have ~4 months of data from Pluggy)

function normalizeDescription(desc: string): string {
  return desc
    .replace(/\d{2}\/\d{2}\/\d{4}/g, '')    // DD/MM/YYYY
    .replace(/\d{2}\/\d{2}/g, '')            // DD/MM
    .replace(/\d{4}-\d{2}-\d{2}/g, '')       // YYYY-MM-DD
    .replace(/\b\d{3,}\b/g, '')              // numbers with 3+ digits (codes, amounts)
    .replace(/\(IOF\)/gi, '')                // remove IOF suffix
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function buildRecurrenceSet(userId: string): Promise<Set<string>> {
  const allTx = await prisma.bankTransaction.findMany({
    where: {
      bankAccount: { bankConnection: { userId } },
      type: 'DEBIT', // Only check debits for recurring expenses
    },
    select: { description: true, amount: true, date: true, category: true },
  });

  // Group by normalized description
  const groups = new Map<string, Array<{ amount: number; month: string }>>();
  for (const tx of allTx) {
    // Don't consider skipped categories for recurrence
    if (tx.category && SKIP_CATEGORIES.has(tx.category.toLowerCase().trim())) continue;

    const key = normalizeDescription(tx.description);
    if (!key) continue;
    const month = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ amount: Math.abs(tx.amount), month });
  }

  const recurringKeys = new Set<string>();
  for (const [key, entries] of groups) {
    const distinctMonths = new Set(entries.map(e => e.month));
    if (distinctMonths.size < 2) continue;

    // Check if amounts are within 20% of each other
    const amounts = entries.map(e => e.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const withinThreshold = amounts.every(
      a => Math.abs(a - avgAmount) / avgAmount <= 0.2
    );
    if (withinThreshold) recurringKeys.add(key);
  }

  return recurringKeys;
}

// --- Main Import ---

type ImportMode = 'all' | 'expenses_only' | 'incomes_only';

interface ImportResult {
  total: number;
  expenses: number;
  incomes: number;
  skipped: number;
  errors: string[];
  batchId: string;
}

export async function importTransactions(
  userId: string,
  mode: ImportMode = 'all',
): Promise<ImportResult> {
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const result: ImportResult = {
    total: 0, expenses: 0, incomes: 0, skipped: 0, errors: [], batchId,
  };

  // 1. Fetch un-imported transactions for this user
  const transactions = await prisma.bankTransaction.findMany({
    where: {
      imported: false,
      bankAccount: { bankConnection: { userId } },
    },
    include: {
      bankAccount: {
        include: { bankConnection: { select: { connectorName: true } } },
      },
    },
    orderBy: { date: 'asc' },
  });

  result.total = transactions.length;
  if (transactions.length === 0) return result;

  // 2. Pre-load user categories (app categories, not Pluggy categories)
  const userCategories = await prisma.category.findMany({
    where: { OR: [{ userId }, { isDefault: true }] },
  });
  const categoryByName = new Map(userCategories.map(c => [c.name, c.id]));

  // 3. Build recurrence set
  const recurringKeys = await buildRecurrenceSet(userId);

  // 4. Process each transaction
  for (const tx of transactions) {
    try {
      // 4a. Skip internal transfers, credit card payments, and investment operations
      if (shouldSkipTransaction(tx.description, tx.category, tx.operationType)) {
        await prisma.bankTransaction.update({
          where: { id: tx.id },
          data: { imported: true },
        });
        result.skipped++;
        continue;
      }

      const displayDescription = cleanDescription(tx.description);

      if (tx.type === 'CREDIT') {
        // Income — money coming in
        if (mode === 'expenses_only') {
          await prisma.bankTransaction.update({ where: { id: tx.id }, data: { imported: true } });
          result.skipped++;
          continue;
        }

        const isRecurring = recurringKeys.has(normalizeDescription(tx.description));

        await prisma.income.create({
          data: {
            userId,
            description: displayDescription,
            amount: Math.abs(tx.amount),
            date: tx.date,
            recurrence: isRecurring ? 'MONTHLY' : 'ONE_TIME',
            bankTransactionId: tx.id,
            importBatchId: batchId,
          },
        });

        await prisma.bankTransaction.update({
          where: { id: tx.id },
          data: { imported: true },
        });
        result.incomes++;
      } else {
        // Expense (DEBIT) — money going out
        if (mode === 'incomes_only') {
          await prisma.bankTransaction.update({ where: { id: tx.id }, data: { imported: true } });
          result.skipped++;
          continue;
        }

        const isRecurring = recurringKeys.has(normalizeDescription(tx.description));
        const appCategory = mapCategory(tx.category, tx.description);
        let categoryId = categoryByName.get(appCategory);

        if (!categoryId) {
          categoryId = categoryByName.get('Other');
        }

        if (!categoryId) {
          result.errors.push(`No category found for tx: ${tx.description} (pluggy cat: ${tx.category})`);
          result.skipped++;
          await prisma.bankTransaction.update({
            where: { id: tx.id },
            data: { imported: true },
          });
          continue;
        }

        const paymentMethod = detectPaymentMethod(tx.operationType, tx.bankAccount.type, tx.bankAccount.name);

        await prisma.expense.create({
          data: {
            userId,
            description: displayDescription,
            amount: Math.abs(tx.amount),
            type: isRecurring ? 'FIXED' : 'VARIABLE',
            fixedAmountType: isRecurring ? 'FIXED_AMOUNT' : null,
            categoryId,
            date: tx.date,
            dueDay: isRecurring ? tx.date.getDate() : undefined,
            status: 'PAID',
            paymentMethod,
            bankTransactionId: tx.id,
            importBatchId: batchId,
            installmentNumber: tx.installmentNumber,
            totalInstallments: tx.totalInstallments,
            installmentGroupId: tx.installmentGroupId,
          },
        });
        result.expenses++;

        await prisma.bankTransaction.update({
          where: { id: tx.id },
          data: { imported: true },
        });
      }
    } catch (err: any) {
      result.errors.push(`Failed to import tx ${tx.id}: ${err.message}`);
      result.skipped++;
    }
  }

  return result;
}
