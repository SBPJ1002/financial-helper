-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'BRL';

-- AlterTable
ALTER TABLE "incomes" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'BRL';
