import { prisma } from '../config/prisma.js';
import { fuzzyMatch, removeAccents } from './classification/utils.js';
import type { MatchStrategy } from '@prisma/client';

interface MatchResult {
  declarationId: string;
  declarationLabel: string;
  stdTransactionId: string;
  strategy: MatchStrategy;
  confidenceScore: number;
  matchedAmount: number;
}

export class DeclarationMatcherService {
  async matchDeclarationsForUser(
    userId: string,
    month: string,
  ): Promise<{ matched: MatchResult[]; unmatched: string[] }> {
    const [year, mon] = month.split('-').map(Number);
    const startDate = new Date(year, mon - 1, 1);
    const endDate = new Date(year, mon, 0, 23, 59, 59);

    const declarations = await prisma.fixedExpenseDeclaration.findMany({
      where: { userId, isActive: true },
    });

    if (declarations.length === 0) return { matched: [], unmatched: [] };

    // Load all StdTransactions for the month
    const allTransactions = await prisma.stdTransaction.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
        isInternalTransfer: false,
      },
      include: {
        stdAccount: { select: { id: true, sourceType: true } },
      },
    });

    const matched: MatchResult[] = [];
    const unmatched: string[] = [];

    for (const decl of declarations) {
      // 1. Select transaction pool based on payment method
      const pool = allTransactions.filter(tx => {
        if (decl.paymentMethod === 'CREDIT_CARD') {
          if (decl.creditAccountId) return tx.stdAccount.id === decl.creditAccountId;
          return tx.stdAccount.sourceType === 'CREDIT';
        }
        // PIX, BOLETO, AUTO_DEBIT → bank accounts
        return tx.stdAccount.sourceType === 'BANK';
      });

      // 2. Filter by amount tolerance
      const amountMin = decl.estimatedAmount * (1 - decl.amountTolerance);
      const amountMax = decl.estimatedAmount * (1 + decl.amountTolerance);
      const candidates = pool.filter(tx => {
        return tx.absoluteAmount >= amountMin && tx.absoluteAmount <= amountMax;
      });

      // 3. Run cascade strategies
      const result = this.findBestMatch(decl, candidates);

      if (result) {
        // 4. Upsert DeclarationMatch
        await prisma.declarationMatch.upsert({
          where: { declarationId_month: { declarationId: decl.id, month } },
          update: {
            stdTransactionId: result.stdTransactionId,
            strategy: result.strategy,
            confidenceScore: result.confidenceScore,
            matchedAmount: result.matchedAmount,
          },
          create: {
            declarationId: decl.id,
            stdTransactionId: result.stdTransactionId,
            strategy: result.strategy,
            confidenceScore: result.confidenceScore,
            month,
            matchedAmount: result.matchedAmount,
          },
        });

        // 5. Update expense type to FIXED if linked and was VARIABLE
        const expense = await prisma.expense.findUnique({
          where: { stdTransactionId: result.stdTransactionId },
        });
        if (expense && expense.type === 'VARIABLE') {
          await prisma.expense.update({
            where: { id: expense.id },
            data: { type: 'FIXED', fixedAmountType: 'FIXED_AMOUNT' },
          });
        }

        matched.push({
          declarationId: decl.id,
          declarationLabel: decl.label,
          ...result,
        });
      } else {
        unmatched.push(decl.id);
      }
    }

    return { matched, unmatched };
  }

  private findBestMatch(
    decl: {
      matchCounterpartDocument: string | null;
      matchKeywords: string[];
      label: string;
      estimatedAmount: number;
      amountTolerance: number;
      expectedDay: number | null;
      dayTolerance: number;
    },
    candidates: Array<{
      id: string;
      descriptionOriginal: string;
      descriptionClean: string;
      counterpartDocument: string | null;
      absoluteAmount: number;
      date: Date;
    }>,
  ): { stdTransactionId: string; strategy: MatchStrategy; confidenceScore: number; matchedAmount: number } | null {
    // Strategy 1: CNPJ_EXACT
    if (decl.matchCounterpartDocument) {
      for (const tx of candidates) {
        if (tx.counterpartDocument === decl.matchCounterpartDocument) {
          return {
            stdTransactionId: tx.id,
            strategy: 'CNPJ_EXACT',
            confidenceScore: 0.95,
            matchedAmount: tx.absoluteAmount,
          };
        }
      }
    }

    // Strategy 2: KEYWORD
    if (decl.matchKeywords.length > 0) {
      for (const tx of candidates) {
        const searchText = removeAccents(tx.descriptionClean.toLowerCase());
        for (const kw of decl.matchKeywords) {
          if (searchText.includes(removeAccents(kw.toLowerCase()))) {
            const confidence = 0.80 + (decl.matchKeywords.length > 1 ? 0.10 : 0.05);
            return {
              stdTransactionId: tx.id,
              strategy: 'KEYWORD',
              confidenceScore: Math.min(confidence, 0.90),
              matchedAmount: tx.absoluteAmount,
            };
          }
        }
      }
    }

    // Strategy 3: FUZZY_NAME
    const declLabel = decl.label.toLowerCase();
    for (const tx of candidates) {
      const txDesc = tx.descriptionClean.toLowerCase();
      if (fuzzyMatch(declLabel, txDesc, 0.6)) {
        const similarity = declLabel.length > 0 ? 0.60 + Math.min(0.15, declLabel.length / 100) : 0.60;
        return {
          stdTransactionId: tx.id,
          strategy: 'FUZZY_NAME',
          confidenceScore: similarity,
          matchedAmount: tx.absoluteAmount,
        };
      }
    }

    // Strategy 4: AMOUNT_RECURRENCE
    if (decl.expectedDay) {
      for (const tx of candidates) {
        const txDay = tx.date instanceof Date ? tx.date.getDate() : new Date(tx.date).getDate();
        if (Math.abs(txDay - decl.expectedDay) <= decl.dayTolerance) {
          const amountDiff = Math.abs(tx.absoluteAmount - decl.estimatedAmount) / decl.estimatedAmount;
          const confidence = 0.40 + (1 - amountDiff) * 0.15;
          return {
            stdTransactionId: tx.id,
            strategy: 'AMOUNT_RECURRENCE',
            confidenceScore: Math.min(Math.max(confidence, 0.40), 0.55),
            matchedAmount: tx.absoluteAmount,
          };
        }
      }
    }

    return null;
  }
}
