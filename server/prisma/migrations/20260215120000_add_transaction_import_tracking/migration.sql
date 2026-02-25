-- AlterTable
ALTER TABLE "bank_transactions" ADD COLUMN     "imported" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "bankTransactionId" TEXT;

-- AlterTable
ALTER TABLE "incomes" ADD COLUMN     "bankTransactionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "expenses_bankTransactionId_key" ON "expenses"("bankTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "incomes_bankTransactionId_key" ON "incomes"("bankTransactionId");

-- AddForeignKey
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_bankTransactionId_fkey" FOREIGN KEY ("bankTransactionId") REFERENCES "bank_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_bankTransactionId_fkey" FOREIGN KEY ("bankTransactionId") REFERENCES "bank_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
