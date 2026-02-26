/**
 * Backfill script: creates ExpenseHistory for FIXED expenses that don't have any.
 * Run with: npx tsx prisma/backfill-history.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const fixedWithoutHistory = await prisma.expense.findMany({
    where: {
      type: 'FIXED',
      history: { none: {} },
    },
    select: { id: true, date: true, amount: true },
  });

  console.log(`Found ${fixedWithoutHistory.length} FIXED expenses without history.`);

  let created = 0;
  for (const exp of fixedWithoutHistory) {
    const d = new Date(exp.date);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    await prisma.expenseHistory.upsert({
      where: { expenseId_month: { expenseId: exp.id, month } },
      update: { amount: exp.amount },
      create: { expenseId: exp.id, month, amount: exp.amount },
    });
    created++;
  }

  console.log(`Created ${created} ExpenseHistory records.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
