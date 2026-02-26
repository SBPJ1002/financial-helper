-- ============================================================
-- 3-Layer Banking Architecture Migration
-- Creates Raw/Standardized layers, migrates data, drops old tables
-- ============================================================

-- CreateEnum
CREATE TYPE "TransactionDirection" AS ENUM ('CREDIT', 'DEBIT');
CREATE TYPE "StdPaymentMethod" AS ENUM ('PIX', 'BOLETO', 'CREDIT_CARD', 'DEBIT_CARD', 'AUTO_DEBIT', 'TRANSFER', 'CASH', 'OTHER');
CREATE TYPE "StdClassificationStatus" AS ENUM ('PENDING', 'AUTO_CLASSIFIED', 'USER_CONFIRMED', 'USER_CORRECTED');
CREATE TYPE "StdSourceType" AS ENUM ('BANK', 'CREDIT', 'INVESTMENT');
CREATE TYPE "DocumentType" AS ENUM ('CPF', 'CNPJ');

-- ============================================================
-- 1. CREATE NEW TABLES (Raw Layer)
-- ============================================================

CREATE TABLE "pluggy_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pluggyItemId" TEXT NOT NULL,
    "connectorId" INTEGER,
    "connectorName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "executionStatus" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "syncCount" INTEGER NOT NULL DEFAULT 0,
    "rawJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pluggy_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pluggy_accounts" (
    "id" TEXT NOT NULL,
    "pluggyItemId" TEXT NOT NULL,
    "pluggyAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subtype" TEXT,
    "number" TEXT,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'BRL',
    "creditLimit" DOUBLE PRECISION,
    "availableCreditLimit" DOUBLE PRECISION,
    "marketingName" TEXT,
    "rawJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pluggy_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pluggy_transactions" (
    "id" TEXT NOT NULL,
    "pluggyAccountId" TEXT NOT NULL,
    "pluggyTxId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "descriptionRaw" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "categoryId" TEXT,
    "operationType" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'BRL',
    "installmentNumber" INTEGER,
    "totalInstallments" INTEGER,
    "cardNumber" TEXT,
    "billDate" TIMESTAMP(3),
    "payerName" TEXT,
    "payerDocType" TEXT,
    "payerDocValue" TEXT,
    "receiverName" TEXT,
    "receiverDocType" TEXT,
    "receiverDocValue" TEXT,
    "merchantName" TEXT,
    "merchantBusinessName" TEXT,
    "merchantCnpj" TEXT,
    "merchantCategoryCode" TEXT,
    "paymentMethod" TEXT,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "processingError" TEXT,
    "rawJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pluggy_transactions_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- 2. CREATE NEW TABLES (Standardized Layer)
-- ============================================================

CREATE TABLE "std_accounts" (
    "id" TEXT NOT NULL,
    "pluggyAccountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceType" "StdSourceType" NOT NULL DEFAULT 'BANK',
    "bankName" TEXT NOT NULL,
    "accountLabel" TEXT NOT NULL,
    "accountNumberMasked" TEXT,
    "currentBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'BRL',
    "creditLimit" DOUBLE PRECISION,
    "billingCycleDay" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "std_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "std_counterparts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "displayName" TEXT NOT NULL,
    "rawNames" TEXT[],
    "mccCode" TEXT,
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "avgAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "std_counterparts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "std_transactions" (
    "id" TEXT NOT NULL,
    "pluggyTransactionId" TEXT NOT NULL,
    "stdAccountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "descriptionOriginal" TEXT NOT NULL,
    "descriptionClean" TEXT NOT NULL,
    "direction" "TransactionDirection" NOT NULL,
    "absoluteAmount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'BRL',
    "paymentMethod" "StdPaymentMethod" NOT NULL DEFAULT 'OTHER',
    "counterpartName" TEXT,
    "counterpartDocument" TEXT,
    "counterpartId" TEXT,
    "installmentGroupId" TEXT,
    "installmentNumber" INTEGER,
    "totalInstallments" INTEGER,
    "isInternalTransfer" BOOLEAN NOT NULL DEFAULT false,
    "isInvoicePayment" BOOLEAN NOT NULL DEFAULT false,
    "isRefund" BOOLEAN NOT NULL DEFAULT false,
    "isSalaryCandidate" BOOLEAN NOT NULL DEFAULT false,
    "classificationStatus" "StdClassificationStatus" NOT NULL DEFAULT 'PENDING',
    "classificationSource" TEXT,
    "confidenceScore" DOUBLE PRECISION,
    "reviewStatus" TEXT,
    "imported" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "std_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "std_credit_invoices" (
    "id" TEXT NOT NULL,
    "stdAccountId" TEXT NOT NULL,
    "referenceMonth" TEXT NOT NULL,
    "closeDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minimumPayment" DOUBLE PRECISION,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "std_credit_invoices_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- 3. INDEXES on new tables
-- ============================================================

CREATE UNIQUE INDEX "pluggy_items_pluggyItemId_key" ON "pluggy_items"("pluggyItemId");
CREATE UNIQUE INDEX "pluggy_accounts_pluggyAccountId_key" ON "pluggy_accounts"("pluggyAccountId");
CREATE UNIQUE INDEX "pluggy_transactions_pluggyTxId_key" ON "pluggy_transactions"("pluggyTxId");
CREATE UNIQUE INDEX "std_accounts_pluggyAccountId_key" ON "std_accounts"("pluggyAccountId");
CREATE UNIQUE INDEX "std_transactions_pluggyTransactionId_key" ON "std_transactions"("pluggyTransactionId");
CREATE UNIQUE INDEX "std_credit_invoices_stdAccountId_referenceMonth_key" ON "std_credit_invoices"("stdAccountId", "referenceMonth");
CREATE UNIQUE INDEX "std_counterparts_userId_document_key" ON "std_counterparts"("userId", "document");

CREATE INDEX "pluggy_items_userId_idx" ON "pluggy_items"("userId");
CREATE INDEX "pluggy_accounts_pluggyItemId_idx" ON "pluggy_accounts"("pluggyItemId");
CREATE INDEX "pluggy_transactions_pluggyAccountId_date_idx" ON "pluggy_transactions"("pluggyAccountId", "date");
CREATE INDEX "pluggy_transactions_isProcessed_idx" ON "pluggy_transactions"("isProcessed");
CREATE INDEX "std_accounts_userId_idx" ON "std_accounts"("userId");
CREATE INDEX "std_transactions_stdAccountId_date_idx" ON "std_transactions"("stdAccountId", "date");
CREATE INDEX "std_transactions_userId_date_idx" ON "std_transactions"("userId", "date");
CREATE INDEX "std_transactions_userId_imported_idx" ON "std_transactions"("userId", "imported");
CREATE INDEX "std_transactions_installmentGroupId_idx" ON "std_transactions"("installmentGroupId");
CREATE INDEX "std_transactions_recurrenceGroupId_idx" ON "std_transactions"("recurrenceGroupId");

-- ============================================================
-- 4. FOREIGN KEYS on new tables
-- ============================================================

ALTER TABLE "pluggy_items" ADD CONSTRAINT "pluggy_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pluggy_accounts" ADD CONSTRAINT "pluggy_accounts_pluggyItemId_fkey" FOREIGN KEY ("pluggyItemId") REFERENCES "pluggy_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pluggy_transactions" ADD CONSTRAINT "pluggy_transactions_pluggyAccountId_fkey" FOREIGN KEY ("pluggyAccountId") REFERENCES "pluggy_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "std_accounts" ADD CONSTRAINT "std_accounts_pluggyAccountId_fkey" FOREIGN KEY ("pluggyAccountId") REFERENCES "pluggy_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "std_counterparts" ADD CONSTRAINT "std_counterparts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "std_transactions" ADD CONSTRAINT "std_transactions_pluggyTransactionId_fkey" FOREIGN KEY ("pluggyTransactionId") REFERENCES "pluggy_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "std_transactions" ADD CONSTRAINT "std_transactions_stdAccountId_fkey" FOREIGN KEY ("stdAccountId") REFERENCES "std_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "std_transactions" ADD CONSTRAINT "std_transactions_counterpartId_fkey" FOREIGN KEY ("counterpartId") REFERENCES "std_counterparts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "std_transactions" ADD CONSTRAINT "std_transactions_recurrenceGroupId_fkey" FOREIGN KEY ("recurrenceGroupId") REFERENCES "recurrence_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "std_credit_invoices" ADD CONSTRAINT "std_credit_invoices_stdAccountId_fkey" FOREIGN KEY ("stdAccountId") REFERENCES "std_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 5. DATA MIGRATION: Copy old data to new tables
-- ============================================================

-- 5a. bank_connections → pluggy_items
INSERT INTO "pluggy_items" ("id", "userId", "pluggyItemId", "connectorName", "status", "lastSyncedAt", "syncCount", "createdAt", "updatedAt")
SELECT "id", "userId", "pluggyItemId", "connectorName", "status"::text, "lastSyncAt", 0, "createdAt", "updatedAt"
FROM "bank_connections";

-- 5b. bank_accounts → pluggy_accounts
INSERT INTO "pluggy_accounts" ("id", "pluggyItemId", "pluggyAccountId", "name", "type", "balance", "currencyCode", "createdAt", "updatedAt")
SELECT ba."id", bc."id", ba."pluggyAccountId", ba."name", ba."type", ba."balance", ba."currencyCode", ba."createdAt", ba."updatedAt"
FROM "bank_accounts" ba
JOIN "bank_connections" bc ON ba."bankConnectionId" = bc."id";

-- 5c. bank_accounts → std_accounts
INSERT INTO "std_accounts" ("id", "pluggyAccountId", "userId", "sourceType", "bankName", "accountLabel", "currentBalance", "currencyCode", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  ba."pluggyAccountId",
  bc."userId",
  CASE WHEN ba."type" = 'CREDIT' THEN 'CREDIT'::"StdSourceType" ELSE 'BANK'::"StdSourceType" END,
  bc."connectorName",
  ba."name",
  ba."balance",
  ba."currencyCode",
  ba."createdAt",
  ba."updatedAt"
FROM "bank_accounts" ba
JOIN "bank_connections" bc ON ba."bankConnectionId" = bc."id";

-- 5d. bank_transactions → pluggy_transactions (basic fields only, already-synced data)
INSERT INTO "pluggy_transactions" ("id", "pluggyAccountId", "pluggyTxId", "description", "amount", "date", "type", "category", "operationType", "installmentNumber", "totalInstallments", "isProcessed", "createdAt")
SELECT
  bt."id",
  ba."id",
  bt."pluggyTxId",
  bt."description",
  bt."amount",
  bt."date",
  bt."type",
  bt."category",
  bt."operationType",
  bt."installmentNumber",
  bt."totalInstallments",
  true,
  bt."createdAt"
FROM "bank_transactions" bt
JOIN "bank_accounts" ba ON bt."bankAccountId" = ba."id";

-- 5e. bank_transactions → std_transactions
INSERT INTO "std_transactions" (
  "id", "pluggyTransactionId", "stdAccountId", "userId",
  "descriptionOriginal", "descriptionClean", "direction", "absoluteAmount",
  "date", "paymentMethod", "counterpartName", "counterpartDocument",
  "installmentGroupId", "installmentNumber", "totalInstallments",
  "isInternalTransfer", "classificationStatus", "classificationSource",
  "confidenceScore", "reviewStatus", "imported", "recurrenceGroupId",
  "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  bt."id",
  sa."id",
  bc."userId",
  bt."description",
  COALESCE(bt."normalizedDescription", bt."description"),
  CASE WHEN bt."amount" >= 0 THEN 'CREDIT'::"TransactionDirection" ELSE 'DEBIT'::"TransactionDirection" END,
  ABS(bt."amount"),
  bt."date",
  CASE
    WHEN bt."paymentMethodDetected" = 'pix' THEN 'PIX'::"StdPaymentMethod"
    WHEN bt."paymentMethodDetected" = 'credit_card' THEN 'CREDIT_CARD'::"StdPaymentMethod"
    WHEN bt."paymentMethodDetected" = 'debit_card' THEN 'DEBIT_CARD'::"StdPaymentMethod"
    WHEN bt."paymentMethodDetected" = 'boleto' THEN 'BOLETO'::"StdPaymentMethod"
    WHEN bt."paymentMethodDetected" = 'transfer' THEN 'TRANSFER'::"StdPaymentMethod"
    ELSE 'OTHER'::"StdPaymentMethod"
  END,
  bt."counterpartName",
  bt."counterpartDocument",
  bt."installmentGroupId",
  bt."installmentNumber",
  bt."totalInstallments",
  bt."isInternal",
  CASE
    WHEN bt."classificationSource" IS NOT NULL THEN 'AUTO_CLASSIFIED'::"StdClassificationStatus"
    ELSE 'PENDING'::"StdClassificationStatus"
  END,
  bt."classificationSource",
  bt."confidenceScore",
  bt."reviewStatus",
  bt."imported",
  bt."recurrenceGroupId",
  bt."createdAt",
  CURRENT_TIMESTAMP
FROM "bank_transactions" bt
JOIN "bank_accounts" ba ON bt."bankAccountId" = ba."id"
JOIN "bank_connections" bc ON ba."bankConnectionId" = bc."id"
JOIN "std_accounts" sa ON sa."pluggyAccountId" = ba."pluggyAccountId";

-- ============================================================
-- 6. REWIRE FK COLUMNS on app tables
-- ============================================================

-- 6a. Add new FK columns to app tables
ALTER TABLE "incomes" ADD COLUMN "stdTransactionId" TEXT;
ALTER TABLE "expenses" ADD COLUMN "stdTransactionId" TEXT;

-- 6b. Populate new FK columns from old data
UPDATE "incomes" i
SET "stdTransactionId" = st."id"
FROM "std_transactions" st
JOIN "pluggy_transactions" pt ON st."pluggyTransactionId" = pt."id"
WHERE i."bankTransactionId" = pt."id";

UPDATE "expenses" e
SET "stdTransactionId" = st."id"
FROM "std_transactions" st
JOIN "pluggy_transactions" pt ON st."pluggyTransactionId" = pt."id"
WHERE e."bankTransactionId" = pt."id";

-- 6c. DeclarationMatch: add new column, populate, drop old
ALTER TABLE "declaration_matches" ADD COLUMN "stdTransactionId" TEXT;

UPDATE "declaration_matches" dm
SET "stdTransactionId" = st."id"
FROM "std_transactions" st
JOIN "pluggy_transactions" pt ON st."pluggyTransactionId" = pt."id"
WHERE dm."bankTransactionId" = pt."id";

-- 6d. InvoicePayment: add new columns, populate, drop old
ALTER TABLE "invoice_payments" ADD COLUMN "stdTransactionId" TEXT;
ALTER TABLE "invoice_payments" ADD COLUMN "stdAccountId" TEXT;

UPDATE "invoice_payments" ip
SET "stdTransactionId" = st."id"
FROM "std_transactions" st
JOIN "pluggy_transactions" pt ON st."pluggyTransactionId" = pt."id"
WHERE ip."bankTransactionId" = pt."id";

UPDATE "invoice_payments" ip
SET "stdAccountId" = sa."id"
FROM "std_accounts" sa
JOIN "pluggy_accounts" pa ON sa."pluggyAccountId" = pa."pluggyAccountId"
JOIN "bank_accounts" ba ON ba."pluggyAccountId" = pa."pluggyAccountId"
WHERE ip."creditAccountId" = ba."id";

-- 6e. FixedExpenseDeclaration: rewire creditAccountId from BankAccount to StdAccount
ALTER TABLE "fixed_expense_declarations" ADD COLUMN "creditAccountId_new" TEXT;

UPDATE "fixed_expense_declarations" fed
SET "creditAccountId_new" = sa."id"
FROM "std_accounts" sa
JOIN "pluggy_accounts" pa ON sa."pluggyAccountId" = pa."pluggyAccountId"
JOIN "bank_accounts" ba ON ba."pluggyAccountId" = pa."pluggyAccountId"
WHERE fed."creditAccountId" = ba."id";

-- 6f. RecurrenceGroup: rewire transactions relation
-- The relation is on BankTransaction.recurrenceGroupId, already migrated to StdTransaction.recurrenceGroupId in step 5e

-- ============================================================
-- 7. DROP OLD CONSTRAINTS AND COLUMNS
-- ============================================================

-- Drop old FK constraints
ALTER TABLE "incomes" DROP CONSTRAINT IF EXISTS "incomes_bankTransactionId_fkey";
ALTER TABLE "expenses" DROP CONSTRAINT IF EXISTS "expenses_bankTransactionId_fkey";
ALTER TABLE "declaration_matches" DROP CONSTRAINT IF EXISTS "declaration_matches_bankTransactionId_fkey";
ALTER TABLE "invoice_payments" DROP CONSTRAINT IF EXISTS "invoice_payments_bankTransactionId_fkey";
ALTER TABLE "invoice_payments" DROP CONSTRAINT IF EXISTS "invoice_payments_creditAccountId_fkey";
ALTER TABLE "fixed_expense_declarations" DROP CONSTRAINT IF EXISTS "fixed_expense_declarations_creditAccountId_fkey";

-- Drop old unique indexes
DROP INDEX IF EXISTS "incomes_bankTransactionId_key";
DROP INDEX IF EXISTS "expenses_bankTransactionId_key";
DROP INDEX IF EXISTS "invoice_payments_bankTransactionId_key";
DROP INDEX IF EXISTS "declaration_matches_bankTransactionId_declarationId_key";

-- Drop old columns
ALTER TABLE "incomes" DROP COLUMN "bankTransactionId";
ALTER TABLE "expenses" DROP COLUMN "bankTransactionId";

ALTER TABLE "declaration_matches" DROP COLUMN "bankTransactionId";
ALTER TABLE "invoice_payments" DROP COLUMN "bankTransactionId";
ALTER TABLE "invoice_payments" DROP COLUMN "creditAccountId";

ALTER TABLE "fixed_expense_declarations" DROP COLUMN "creditAccountId";
ALTER TABLE "fixed_expense_declarations" RENAME COLUMN "creditAccountId_new" TO "creditAccountId";

-- ============================================================
-- 8. ADD NEW FK CONSTRAINTS on rewired columns
-- ============================================================

CREATE UNIQUE INDEX "incomes_stdTransactionId_key" ON "incomes"("stdTransactionId");
CREATE UNIQUE INDEX "expenses_stdTransactionId_key" ON "expenses"("stdTransactionId");
CREATE UNIQUE INDEX "invoice_payments_stdTransactionId_key" ON "invoice_payments"("stdTransactionId");
CREATE UNIQUE INDEX "declaration_matches_stdTransactionId_declarationId_key" ON "declaration_matches"("stdTransactionId", "declarationId");

ALTER TABLE "incomes" ADD CONSTRAINT "incomes_stdTransactionId_fkey" FOREIGN KEY ("stdTransactionId") REFERENCES "std_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_stdTransactionId_fkey" FOREIGN KEY ("stdTransactionId") REFERENCES "std_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "declaration_matches" ADD CONSTRAINT "declaration_matches_stdTransactionId_fkey" FOREIGN KEY ("stdTransactionId") REFERENCES "std_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_stdTransactionId_fkey" FOREIGN KEY ("stdTransactionId") REFERENCES "std_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_stdAccountId_fkey" FOREIGN KEY ("stdAccountId") REFERENCES "std_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fixed_expense_declarations" ADD CONSTRAINT "fixed_expense_declarations_creditAccountId_fkey" FOREIGN KEY ("creditAccountId") REFERENCES "std_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- 9. DROP OLD TABLES (RecurrenceGroup FK already rewired)
-- ============================================================

-- Remove old RecurrenceGroup → BankTransaction FK
ALTER TABLE "bank_transactions" DROP CONSTRAINT IF EXISTS "bank_transactions_recurrenceGroupId_fkey";

-- Drop old tables in order (respecting FK dependencies)
DROP TABLE IF EXISTS "bank_transactions" CASCADE;
DROP TABLE IF EXISTS "bank_accounts" CASCADE;
DROP TABLE IF EXISTS "bank_connections" CASCADE;

-- Drop old enum
DROP TYPE IF EXISTS "BankConnectionStatus";
