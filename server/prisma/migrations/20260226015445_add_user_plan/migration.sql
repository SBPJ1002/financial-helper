-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'AI_AGENT', 'FULL');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'FREE';
