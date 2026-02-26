// ============================================================
// standardization-pipeline.ts
// Main pipeline: processes PluggyTransactions into StdTransactions
// ============================================================

import { PrismaClient, StdSourceType, TransactionDirection } from '@prisma/client';
import { cleanDescription } from './description-cleaner.js';
import { detectPaymentMethod } from './payment-detector.js';
import { extractCounterpart, resolveCounterpart } from './counterpart-resolver.js';
import { detectFlags } from './flag-detector.js';

export class StandardizationPipeline {
  constructor(private prisma: PrismaClient) {}

  /**
   * Process all unprocessed PluggyTransactions for a user.
   * Creates/updates StdTransaction records.
   */
  async processAll(userId: string): Promise<{ processed: number; errors: number }> {
    const unprocessed = await this.prisma.pluggyTransaction.findMany({
      where: {
        isProcessed: false,
        pluggyAccount: { pluggyItem: { userId } },
      },
      include: {
        pluggyAccount: {
          include: {
            stdAccount: { select: { id: true, sourceType: true } },
            pluggyItem: { select: { connectorName: true, userId: true } },
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    let processed = 0;
    let errors = 0;

    for (const rawTx of unprocessed) {
      try {
        await this.processOne(rawTx);
        processed++;
      } catch (err: any) {
        errors++;
        console.error(`Standardization error for tx ${rawTx.id}: ${err.message}`);
        await this.prisma.pluggyTransaction.update({
          where: { id: rawTx.id },
          data: { processingError: err.message },
        });
      }
    }

    return { processed, errors };
  }

  /**
   * Reprocess all transactions for a user (e.g. after pipeline logic changes).
   * Marks all as unprocessed first, then re-runs the pipeline.
   */
  async reprocessAll(userId: string): Promise<{ processed: number; errors: number }> {
    await this.prisma.pluggyTransaction.updateMany({
      where: { pluggyAccount: { pluggyItem: { userId } } },
      data: { isProcessed: false, processingError: null },
    });

    return this.processAll(userId);
  }

  /**
   * Process a single PluggyTransaction into a StdTransaction.
   */
  private async processOne(rawTx: {
    id: string;
    pluggyAccountId: string;
    pluggyTxId: string;
    description: string;
    descriptionRaw: string | null;
    amount: number;
    date: Date;
    type: string;
    category: string | null;
    operationType: string | null;
    currencyCode: string;
    installmentNumber: number | null;
    totalInstallments: number | null;
    paymentMethod: string | null;
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
    pluggyAccount: {
      id: string;
      stdAccount: { id: string; sourceType: StdSourceType } | null;
      pluggyItem: { connectorName: string; userId: string };
    };
  }): Promise<void> {
    const stdAccount = rawTx.pluggyAccount.stdAccount;
    if (!stdAccount) {
      throw new Error(`No StdAccount for PluggyAccount ${rawTx.pluggyAccountId}`);
    }

    const userId = rawTx.pluggyAccount.pluggyItem.userId;
    const accountSourceType = stdAccount.sourceType;

    // 1. Clean description
    const descriptionClean = cleanDescription(rawTx.description, rawTx.descriptionRaw);

    // 2. Detect payment method
    const paymentMethod = detectPaymentMethod(rawTx, accountSourceType);

    // 3. Extract and resolve counterpart
    const extracted = extractCounterpart(rawTx);
    const counterpartId = await resolveCounterpart(
      this.prisma,
      userId,
      extracted,
      Math.abs(rawTx.amount),
    );

    // 4. Detect flags
    const flags = detectFlags(rawTx, accountSourceType);

    // 5. Determine direction and absolute amount
    const direction: TransactionDirection = rawTx.amount >= 0 ? 'CREDIT' : 'DEBIT';
    const absoluteAmount = Math.abs(rawTx.amount);

    // 6. Build installment group ID
    let installmentGroupId: string | null = null;
    if (rawTx.totalInstallments && rawTx.totalInstallments > 1) {
      const normalized = rawTx.description.toLowerCase().replace(/\s+/g, '_');
      const totalAmount = (absoluteAmount * rawTx.totalInstallments).toFixed(2);
      installmentGroupId = `${stdAccount.id}_${normalized}_${totalAmount}_${rawTx.totalInstallments}x`;
    }

    // 7. Upsert StdTransaction
    await this.prisma.stdTransaction.upsert({
      where: { pluggyTransactionId: rawTx.id },
      update: {
        descriptionOriginal: rawTx.description,
        descriptionClean,
        direction,
        absoluteAmount,
        date: rawTx.date,
        currencyCode: rawTx.currencyCode,
        paymentMethod,
        counterpartName: extracted.name,
        counterpartDocument: extracted.document,
        counterpartId,
        installmentGroupId,
        installmentNumber: rawTx.installmentNumber,
        totalInstallments: rawTx.totalInstallments,
        isInternalTransfer: flags.isInternalTransfer,
        isInvoicePayment: flags.isInvoicePayment,
        isRefund: flags.isRefund,
        isSalaryCandidate: flags.isSalaryCandidate,
      },
      create: {
        pluggyTransactionId: rawTx.id,
        stdAccountId: stdAccount.id,
        userId,
        descriptionOriginal: rawTx.description,
        descriptionClean,
        direction,
        absoluteAmount,
        date: rawTx.date,
        currencyCode: rawTx.currencyCode,
        paymentMethod,
        counterpartName: extracted.name,
        counterpartDocument: extracted.document,
        counterpartId,
        installmentGroupId,
        installmentNumber: rawTx.installmentNumber,
        totalInstallments: rawTx.totalInstallments,
        isInternalTransfer: flags.isInternalTransfer,
        isInvoicePayment: flags.isInvoicePayment,
        isRefund: flags.isRefund,
        isSalaryCandidate: flags.isSalaryCandidate,
      },
    });

    // 8. Mark raw transaction as processed
    await this.prisma.pluggyTransaction.update({
      where: { id: rawTx.id },
      data: { isProcessed: true, processingError: null },
    });
  }
}
