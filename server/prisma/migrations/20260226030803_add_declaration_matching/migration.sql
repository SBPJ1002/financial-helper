-- CreateEnum
CREATE TYPE "DeclarationPaymentMethod" AS ENUM ('PIX', 'BOLETO', 'AUTO_DEBIT', 'CREDIT_CARD');

-- CreateEnum
CREATE TYPE "MatchStrategy" AS ENUM ('CNPJ_EXACT', 'KEYWORD', 'FUZZY_NAME', 'AMOUNT_RECURRENCE');

-- AlterTable
ALTER TABLE "bank_transactions" ADD COLUMN     "isInternal" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "fixed_expense_declarations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "categoryName" TEXT,
    "paymentMethod" "DeclarationPaymentMethod" NOT NULL,
    "creditAccountId" TEXT,
    "estimatedAmount" DOUBLE PRECISION NOT NULL,
    "amountTolerance" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "expectedDay" INTEGER,
    "dayTolerance" INTEGER NOT NULL DEFAULT 5,
    "matchKeywords" TEXT[],
    "matchCounterpartDocument" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fixed_expense_declarations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "declaration_matches" (
    "id" TEXT NOT NULL,
    "declarationId" TEXT NOT NULL,
    "bankTransactionId" TEXT NOT NULL,
    "strategy" "MatchStrategy" NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "month" TEXT NOT NULL,
    "matchedAmount" DOUBLE PRECISION NOT NULL,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "declaration_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bankTransactionId" TEXT NOT NULL,
    "creditAccountId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "month" TEXT NOT NULL,
    "detectedDescription" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fixed_expense_declarations_userId_idx" ON "fixed_expense_declarations"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "declaration_matches_declarationId_month_key" ON "declaration_matches"("declarationId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "declaration_matches_bankTransactionId_declarationId_key" ON "declaration_matches"("bankTransactionId", "declarationId");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_payments_bankTransactionId_key" ON "invoice_payments"("bankTransactionId");

-- AddForeignKey
ALTER TABLE "fixed_expense_declarations" ADD CONSTRAINT "fixed_expense_declarations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_expense_declarations" ADD CONSTRAINT "fixed_expense_declarations_creditAccountId_fkey" FOREIGN KEY ("creditAccountId") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "declaration_matches" ADD CONSTRAINT "declaration_matches_declarationId_fkey" FOREIGN KEY ("declarationId") REFERENCES "fixed_expense_declarations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "declaration_matches" ADD CONSTRAINT "declaration_matches_bankTransactionId_fkey" FOREIGN KEY ("bankTransactionId") REFERENCES "bank_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_bankTransactionId_fkey" FOREIGN KEY ("bankTransactionId") REFERENCES "bank_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_creditAccountId_fkey" FOREIGN KEY ("creditAccountId") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
