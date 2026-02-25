-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('EXPENSE', 'INCOME', 'BOTH');

-- CreateEnum
CREATE TYPE "FixedAmountType" AS ENUM ('FIXED_AMOUNT', 'VARIABLE_AMOUNT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BILL_DUE', 'EXPENSE_ABOVE', 'VARIABLE_AMOUNT_NEEDED', 'CONTRACT_ENDING');

-- AlterEnum
ALTER TYPE "Recurrence" ADD VALUE 'CONTRACT';

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "type" "CategoryType" NOT NULL DEFAULT 'EXPENSE';

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "fixedAmountType" "FixedAmountType",
ADD COLUMN     "importBatchId" TEXT;

-- AlterTable
ALTER TABLE "incomes" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "contractMonths" INTEGER,
ADD COLUMN     "contractStartDate" TIMESTAMP(3),
ADD COLUMN     "importBatchId" TEXT,
ADD COLUMN     "recurrenceDay" INTEGER;

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
