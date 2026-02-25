-- AlterTable
ALTER TABLE "investments" ADD COLUMN     "amountProfit" DOUBLE PRECISION,
ADD COLUMN     "annualRate" DOUBLE PRECISION,
ADD COLUMN     "lastMonthRate" DOUBLE PRECISION,
ADD COLUMN     "pluggyInvestmentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "investments_pluggyInvestmentId_key" ON "investments"("pluggyInvestmentId");
