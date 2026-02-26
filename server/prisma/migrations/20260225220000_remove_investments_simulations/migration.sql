-- DropForeignKey
ALTER TABLE "asset_prices" DROP CONSTRAINT "asset_prices_assetId_fkey";

-- DropForeignKey
ALTER TABLE "investment_snapshots" DROP CONSTRAINT "investment_snapshots_investmentId_fkey";

-- DropForeignKey
ALTER TABLE "investment_snapshots" DROP CONSTRAINT "investment_snapshots_userId_fkey";

-- DropForeignKey
ALTER TABLE "investments" DROP CONSTRAINT "investments_assetId_fkey";

-- DropForeignKey
ALTER TABLE "investments" DROP CONSTRAINT "investments_investmentTypeId_fkey";

-- DropForeignKey
ALTER TABLE "investments" DROP CONSTRAINT "investments_userId_fkey";

-- DropForeignKey
ALTER TABLE "simulation_scenarios" DROP CONSTRAINT "simulation_scenarios_userId_fkey";

-- AlterTable
ALTER TABLE "user_settings" DROP COLUMN "aiIncludeInvestments";

-- DropTable
DROP TABLE "asset_prices";

-- DropTable
DROP TABLE "assets";

-- DropTable
DROP TABLE "economic_rates";

-- DropTable
DROP TABLE "investment_snapshots";

-- DropTable
DROP TABLE "investment_types";

-- DropTable
DROP TABLE "investments";

-- DropTable
DROP TABLE "simulation_scenarios";

-- DropEnum
DROP TYPE "AssetType";

-- DropEnum
DROP TYPE "InvestmentCategory";

-- DropEnum
DROP TYPE "InvestmentStatus";

-- DropEnum
DROP TYPE "YieldType";
