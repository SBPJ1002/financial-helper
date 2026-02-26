// ============================================================
// classification-service.ts
// Main service — orchestrates classification and record creation
// Now reads from StdTransaction (standardized layer)
// ============================================================

import { prisma } from '../../config/prisma.js';
import { classifyBatch, getClassificationStats } from './classifier.js';
import {
  ClassifiableTransaction,
  ClassificationResult,
  UserClassificationRule,
  RecurrenceGroup,
  KeywordMapping,
  TransactionType,
} from './types.js';

// --- Payment Method mapping: StdPaymentMethod → Prisma PaymentMethod enum ---

function mapPaymentMethodToEnum(method: string): 'PIX' | 'CREDIT' | 'DEBIT' | undefined {
  switch (method) {
    case 'PIX': return 'PIX';
    case 'CREDIT_CARD': return 'CREDIT';
    case 'DEBIT_CARD': return 'DEBIT';
    case 'BOLETO': return 'DEBIT';
    case 'AUTO_DEBIT': return 'DEBIT';
    case 'TRANSFER': return 'PIX';
    default: return undefined;
  }
}

// --- Profile-based keyword boosts ---

const FIXED_EXPENSE_TO_CATEGORY: Record<string, { keywords: string[]; category: string }> = {
  rent_mortgage: { keywords: ['aluguel', 'financiamento', 'mortgage', 'rent'], category: 'Moradia' },
  condo: { keywords: ['condominio', 'condomínio', 'condo'], category: 'Moradia' },
  electricity: { keywords: ['energia', 'luz', 'eletrica', 'cemig', 'enel', 'cpfl', 'light'], category: 'Moradia' },
  water: { keywords: ['agua', 'água', 'saneamento', 'sabesp', 'copasa'], category: 'Moradia' },
  internet: { keywords: ['internet', 'fibra', 'banda larga', 'vivo', 'claro', 'tim', 'oi'], category: 'Serviços' },
  cellphone: { keywords: ['celular', 'telefone', 'mobile', 'vivo', 'claro', 'tim'], category: 'Serviços' },
  health_insurance: { keywords: ['plano de saude', 'plano saude', 'unimed', 'amil', 'sulamerica', 'bradesco saude'], category: 'Saúde' },
  insurance: { keywords: ['seguro', 'insurance', 'porto seguro', 'tokio marine'], category: 'Seguro' },
  gym: { keywords: ['academia', 'gym', 'smart fit', 'bluefit'], category: 'Pessoal' },
  streaming: { keywords: ['netflix', 'spotify', 'disney', 'hbo', 'amazon prime', 'youtube premium', 'deezer'], category: 'Assinaturas' },
  education: { keywords: ['faculdade', 'escola', 'curso', 'mensalidade', 'education'], category: 'Educação' },
  alimony: { keywords: ['pensao', 'pensão', 'alimony'], category: 'Pessoal' },
};

function getProfileBoosts(profile: {
  expectedFixedExpenses: string[];
  incomeType: string | null;
  expectedIncomeDay: number | null;
} | null): KeywordMapping[] {
  if (!profile) return [];
  const boosts: KeywordMapping[] = [];
  let boostId = 0;

  for (const expenseKey of profile.expectedFixedExpenses) {
    const mapping = FIXED_EXPENSE_TO_CATEGORY[expenseKey];
    if (!mapping) continue;
    for (const keyword of mapping.keywords) {
      boosts.push({
        id: `profile_boost_${boostId++}`,
        keyword,
        matchField: 'normalized_description',
        matchType: 'contains',
        transactionType: 'fixed_expense',
        categoryName: mapping.category,
        confidenceBoost: 0.15,
        isActive: true,
      });
    }
  }

  if (
    (profile.incomeType === 'CLT' || profile.incomeType === 'RETIREMENT') &&
    profile.expectedIncomeDay
  ) {
    const salaryKeywords = ['salario', 'salário', 'salary', 'pagamento', 'folha', 'remuneracao', 'proventos', 'beneficio'];
    for (const keyword of salaryKeywords) {
      boosts.push({
        id: `profile_boost_${boostId++}`,
        keyword,
        matchField: 'normalized_description',
        matchType: 'contains',
        transactionType: 'income',
        categoryName: 'Salário',
        confidenceBoost: 0.15,
        isActive: true,
      });
    }
  }

  return boosts;
}

// --- Main Service ---

export interface ImportResult {
  total: number;
  expenses: number;
  incomes: number;
  skipped: number;
  errors: string[];
  batchId: string;
  stats?: ReturnType<typeof getClassificationStats>;
}

export class ClassificationService {
  /**
   * Main entry point: processes un-imported StdTransactions for a user.
   * 1. Fetches un-imported StdTransactions (excluding internal transfers and invoice payments)
   * 2. Maps to ClassifiableTransaction
   * 3. Classifies using 3-layer engine
   * 4. Creates Expense/Income records
   * 5. Updates StdTransaction with classification metadata
   */
  async processNewTransactions(
    userId: string,
    mode: 'all' | 'expenses_only' | 'incomes_only' = 'all',
  ): Promise<ImportResult> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const result: ImportResult = {
      total: 0, expenses: 0, incomes: 0, skipped: 0, errors: [], batchId,
    };

    // 1. Fetch un-imported StdTransactions, excluding internal transfers and invoice payments
    const transactions = await prisma.stdTransaction.findMany({
      where: {
        userId,
        imported: false,
        isInternalTransfer: false,
        isInvoicePayment: false,
      },
      include: {
        stdAccount: { select: { id: true, sourceType: true, bankName: true } },
      },
      orderBy: { date: 'asc' },
    });

    result.total = transactions.length;
    if (transactions.length === 0) return result;

    // 2. Handle invoice payments — mark as imported separately
    const invoicePayments = await prisma.stdTransaction.findMany({
      where: { userId, imported: false, isInvoicePayment: true },
      include: {
        stdAccount: { select: { id: true } },
      },
    });
    for (const ip of invoicePayments) {
      try {
        await this.recordInvoicePayment(userId, ip);
      } catch (err: any) {
        console.warn(`Failed to record invoice payment for tx ${ip.id}: ${err.message}`);
      }
      await prisma.stdTransaction.update({
        where: { id: ip.id },
        data: { imported: true },
      });
      result.skipped++;
    }

    // Also mark internal transfers as imported
    await prisma.stdTransaction.updateMany({
      where: { userId, imported: false, isInternalTransfer: true },
      data: { imported: true },
    });

    // 3. Pre-load user categories
    const userCategories = await prisma.category.findMany({
      where: { OR: [{ userId }, { isDefault: true }] },
    });
    const categoryByName = new Map(userCategories.map(c => [c.name, c.id]));

    // 4. Load classification context + user financial profile
    const [userRules, recurrenceGroups, keywordMappings, userProfile] = await Promise.all([
      this.getUserRules(userId),
      this.getRecurrenceGroups(userId),
      this.getKeywordMappings(),
      prisma.userFinancialProfile.findUnique({
        where: { userId },
        select: { expectedFixedExpenses: true, incomeType: true, expectedIncomeDay: true },
      }),
    ]);

    const profileBoosts = getProfileBoosts(userProfile);
    keywordMappings.push(...profileBoosts);

    // 5. Map StdTransactions to ClassifiableTransactions
    const classifiable: ClassifiableTransaction[] = transactions.map(tx => ({
      id: tx.id,
      pluggyTransactionId: tx.pluggyTransactionId,
      stdAccountId: tx.stdAccountId,
      descriptionClean: tx.descriptionClean,
      descriptionOriginal: tx.descriptionOriginal,
      direction: tx.direction,
      absoluteAmount: tx.absoluteAmount,
      date: tx.date,
      paymentMethod: tx.paymentMethod,
      counterpartName: tx.counterpartName,
      counterpartDocument: tx.counterpartDocument,
      isSalaryCandidate: tx.isSalaryCandidate,
      installmentNumber: tx.installmentNumber,
      totalInstallments: tx.totalInstallments,
    }));

    // 6. Classify in batch
    const classifications = classifyBatch(
      classifiable,
      userRules,
      recurrenceGroups,
      keywordMappings
    );

    result.stats = getClassificationStats(classifications);

    // 7. Process each transaction: create Expense/Income + update StdTransaction
    for (const tx of transactions) {
      const cls = classifications.get(tx.id);

      if (!cls) {
        result.errors.push(`No classification for tx ${tx.id}`);
        result.skipped++;
        continue;
      }

      try {
        await this.processOneTransaction(tx, cls, userId, batchId, mode, categoryByName, result);
      } catch (err: any) {
        result.errors.push(`Failed to import tx ${tx.id}: ${err.message}`);
        result.skipped++;
      }
    }

    return result;
  }

  // ========================================================
  // Private: process a single transaction
  // ========================================================

  private async processOneTransaction(
    tx: {
      id: string;
      descriptionClean: string;
      descriptionOriginal: string;
      direction: string;
      absoluteAmount: number;
      date: Date;
      paymentMethod: string;
      installmentNumber: number | null;
      totalInstallments: number | null;
      installmentGroupId: string | null;
    },
    cls: ClassificationResult,
    userId: string,
    batchId: string,
    mode: string,
    categoryByName: Map<string, string>,
    result: ImportResult,
  ): Promise<void> {
    const isIncome = cls.transactionType === 'income';
    const isFixed = cls.transactionType === 'fixed_expense';

    // Mode filtering
    if (isIncome && mode === 'expenses_only') {
      await this.markImported(tx.id, cls);
      result.skipped++;
      return;
    }
    if (!isIncome && mode === 'incomes_only') {
      await this.markImported(tx.id, cls);
      result.skipped++;
      return;
    }

    // Resolve category
    let categoryId = cls.categoryName ? categoryByName.get(cls.categoryName) : undefined;
    if (!categoryId) {
      categoryId = categoryByName.get('Outros');
    }

    if (isIncome) {
      await prisma.income.create({
        data: {
          userId,
          description: tx.descriptionClean || tx.descriptionOriginal,
          amount: tx.absoluteAmount,
          date: tx.date,
          recurrence: isFixed ? 'MONTHLY' : 'ONE_TIME',
          stdTransactionId: tx.id,
          importBatchId: batchId,
          categoryId: categoryId || undefined,
        },
      });
      result.incomes++;
    } else {
      if (!categoryId) {
        result.errors.push(`No category for tx: ${tx.descriptionOriginal}`);
        await this.markImported(tx.id, cls);
        result.skipped++;
        return;
      }

      const paymentMethod = mapPaymentMethodToEnum(tx.paymentMethod);

      const createdExpense = await prisma.expense.create({
        data: {
          userId,
          description: tx.descriptionClean || tx.descriptionOriginal,
          amount: tx.absoluteAmount,
          type: isFixed ? 'FIXED' : 'VARIABLE',
          fixedAmountType: isFixed ? 'FIXED_AMOUNT' : null,
          categoryId,
          date: tx.date,
          dueDay: isFixed ? tx.date.getDate() : undefined,
          status: 'PAID',
          paymentMethod,
          stdTransactionId: tx.id,
          importBatchId: batchId,
          installmentNumber: tx.installmentNumber,
          totalInstallments: tx.totalInstallments,
          installmentGroupId: tx.installmentGroupId,
        },
      });

      if (isFixed) {
        const txDate = tx.date instanceof Date ? tx.date : new Date(tx.date);
        const month = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
        await prisma.expenseHistory.create({
          data: { expenseId: createdExpense.id, month, amount: tx.absoluteAmount },
        });
      }

      result.expenses++;
    }

    await this.markImported(tx.id, cls);
  }

  private async markImported(
    txId: string,
    cls: ClassificationResult,
  ): Promise<void> {
    await prisma.stdTransaction.update({
      where: { id: txId },
      data: {
        imported: true,
        classificationSource: cls.source,
        confidenceScore: cls.confidenceScore,
        reviewStatus: cls.reviewStatus,
        recurrenceGroupId: cls.recurrenceGroupId,
        classificationStatus: cls.confidenceScore >= 0.80 ? 'AUTO_CLASSIFIED' : 'PENDING',
      },
    });
  }

  private async recordInvoicePayment(
    userId: string,
    tx: { id: string; descriptionOriginal: string; absoluteAmount: number; date: Date; stdAccountId: string },
  ): Promise<void> {
    const existing = await prisma.invoicePayment.findUnique({
      where: { stdTransactionId: tx.id },
    });
    if (existing) return;

    // Find credit accounts to match against
    const creditAccounts = await prisma.stdAccount.findMany({
      where: { userId, sourceType: 'CREDIT' },
      select: { id: true, accountLabel: true },
    });

    let stdAccountId = creditAccounts[0]?.id;
    if (!stdAccountId) return;

    // Try to match by account name in description
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

  // ========================================================
  // Data loading helpers
  // ========================================================

  private async getUserRules(userId: string): Promise<UserClassificationRule[]> {
    const rules = await prisma.classificationRule.findMany({
      where: { userId, isActive: true },
      orderBy: { priority: 'asc' },
    });

    return rules.map(r => ({
      id: r.id,
      userId: r.userId,
      matchCounterpartDocument: r.matchCounterpartDocument,
      matchCounterpartName: r.matchCounterpartName,
      matchDescriptionContains: r.matchDescriptionContains,
      matchPaymentMethod: r.matchPaymentMethod as any,
      matchAmountMin: r.matchAmountMin,
      matchAmountMax: r.matchAmountMax,
      transactionType: r.transactionType as TransactionType,
      categoryName: r.categoryName,
      customLabel: r.customLabel,
      priority: r.priority,
      isActive: r.isActive,
    }));
  }

  private async getRecurrenceGroups(userId: string): Promise<RecurrenceGroup[]> {
    const groups = await prisma.recurrenceGroup.findMany({
      where: { userId, isActive: true },
    });

    return groups.map(g => ({
      id: g.id,
      userId: g.userId,
      label: g.label,
      counterpartPattern: g.counterpartPattern,
      amountAvg: g.amountAvg,
      amountTolerance: g.amountTolerance,
      dayOfMonthAvg: g.dayOfMonthAvg,
      dayTolerance: g.dayTolerance,
      transactionType: g.transactionType as TransactionType,
      categoryName: g.categoryName,
      occurrenceCount: g.occurrenceCount,
      firstSeenAt: g.firstSeenAt,
      lastSeenAt: g.lastSeenAt,
      isActive: g.isActive,
      confirmedByUser: g.confirmedByUser,
    }));
  }

  private async getKeywordMappings(): Promise<KeywordMapping[]> {
    const mappings = await prisma.keywordMapping.findMany({
      where: { isActive: true },
    });

    return mappings.map(m => ({
      id: m.id,
      keyword: m.keyword,
      matchField: m.matchField as any,
      matchType: m.matchType as any,
      transactionType: m.transactionType as TransactionType,
      categoryName: m.categoryName,
      confidenceBoost: m.confidenceBoost,
      isActive: m.isActive,
    }));
  }
}
