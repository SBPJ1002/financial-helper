-- CreateEnum
CREATE TYPE "UserGoal" AS ENUM ('SAVE_MORE', 'PAY_OFF_DEBT', 'CONTROL_SPENDING', 'INVEST_MORE', 'BUILD_EMERGENCY_FUND');

-- CreateEnum
CREATE TYPE "IncomeType" AS ENUM ('CLT', 'SELF_EMPLOYED', 'FREELANCER', 'BUSINESS_OWNER', 'RETIREMENT', 'OTHER_INCOME');

-- CreateEnum
CREATE TYPE "HousingType" AS ENUM ('OWN_PAID', 'OWN_MORTGAGE', 'RENT', 'FAMILY');

-- CreateEnum
CREATE TYPE "IncomeRange" AS ENUM ('UP_TO_2K', 'FROM_2K_TO_5K', 'FROM_5K_TO_10K', 'FROM_10K_TO_20K', 'ABOVE_20K');

-- CreateTable
CREATE TABLE "user_financial_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "primaryGoal" "UserGoal",
    "financialControlScore" INTEGER,
    "bankAccountCount" INTEGER,
    "creditCardCount" INTEGER,
    "preferredPaymentMethods" TEXT[],
    "incomeType" "IncomeType",
    "expectedIncomeDay" INTEGER,
    "incomeRange" "IncomeRange",
    "incomeIsVariable" BOOLEAN NOT NULL DEFAULT false,
    "housingType" "HousingType",
    "hasDependents" BOOLEAN NOT NULL DEFAULT false,
    "dependentTypes" TEXT[],
    "expectedFixedExpenses" TEXT[],
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "onboardingCompletedAt" TIMESTAMP(3),
    "onboardingStepReached" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_financial_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_financial_profiles_userId_key" ON "user_financial_profiles"("userId");

-- AddForeignKey
ALTER TABLE "user_financial_profiles" ADD CONSTRAINT "user_financial_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
