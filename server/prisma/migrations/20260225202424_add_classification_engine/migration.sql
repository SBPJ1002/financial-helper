-- AlterTable
ALTER TABLE "bank_transactions" ADD COLUMN     "classificationSource" TEXT,
ADD COLUMN     "confidenceScore" DOUBLE PRECISION,
ADD COLUMN     "counterpartDocument" TEXT,
ADD COLUMN     "counterpartName" TEXT,
ADD COLUMN     "normalizedDescription" TEXT,
ADD COLUMN     "paymentMethodDetected" TEXT,
ADD COLUMN     "recurrenceGroupId" TEXT,
ADD COLUMN     "reviewStatus" TEXT;

-- CreateTable
CREATE TABLE "recurrence_groups" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "counterpartPattern" TEXT,
    "amountAvg" DOUBLE PRECISION NOT NULL,
    "amountTolerance" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "dayOfMonthAvg" INTEGER,
    "dayTolerance" INTEGER NOT NULL DEFAULT 5,
    "transactionType" TEXT NOT NULL DEFAULT 'fixed_expense',
    "categoryName" TEXT,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 0,
    "firstSeenAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "confirmedByUser" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurrence_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classification_rules" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matchCounterpartDocument" TEXT,
    "matchCounterpartName" TEXT,
    "matchDescriptionContains" TEXT,
    "matchPaymentMethod" TEXT,
    "matchAmountMin" DOUBLE PRECISION,
    "matchAmountMax" DOUBLE PRECISION,
    "transactionType" TEXT NOT NULL,
    "categoryName" TEXT,
    "customLabel" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classification_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keyword_mappings" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "matchField" TEXT NOT NULL DEFAULT 'normalized_description',
    "matchType" TEXT NOT NULL DEFAULT 'contains',
    "transactionType" TEXT NOT NULL,
    "categoryName" TEXT,
    "confidenceBoost" DOUBLE PRECISION NOT NULL DEFAULT 0.50,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "keyword_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recurrence_groups_userId_idx" ON "recurrence_groups"("userId");

-- CreateIndex
CREATE INDEX "classification_rules_userId_idx" ON "classification_rules"("userId");

-- CreateIndex
CREATE INDEX "bank_transactions_recurrenceGroupId_idx" ON "bank_transactions"("recurrenceGroupId");

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_recurrenceGroupId_fkey" FOREIGN KEY ("recurrenceGroupId") REFERENCES "recurrence_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurrence_groups" ADD CONSTRAINT "recurrence_groups_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classification_rules" ADD CONSTRAINT "classification_rules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
