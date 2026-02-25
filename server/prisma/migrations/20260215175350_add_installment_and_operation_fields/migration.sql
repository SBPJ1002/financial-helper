-- AlterTable
ALTER TABLE "bank_transactions" ADD COLUMN     "installmentGroupId" TEXT,
ADD COLUMN     "installmentNumber" INTEGER,
ADD COLUMN     "operationType" TEXT,
ADD COLUMN     "totalInstallments" INTEGER;

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "installmentGroupId" TEXT,
ADD COLUMN     "installmentNumber" INTEGER,
ADD COLUMN     "totalInstallments" INTEGER;

-- AlterTable
ALTER TABLE "user_settings" ALTER COLUMN "aiProvider" SET DEFAULT 'google',
ALTER COLUMN "aiModel" SET DEFAULT 'auto';

-- CreateIndex
CREATE INDEX "bank_transactions_installmentGroupId_idx" ON "bank_transactions"("installmentGroupId");

-- CreateIndex
CREATE INDEX "expenses_installmentGroupId_idx" ON "expenses"("installmentGroupId");
