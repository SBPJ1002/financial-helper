import { prisma } from '../config/prisma.js';
import { calculateCurrentValue } from '../services/yieldCalculator.service.js';

export async function createMonthlySnapshots() {
  const now = new Date();
  // Snapshot for the previous month
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const month = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

  const activeInvestments = await prisma.investment.findMany({
    where: { status: 'ACTIVE' },
  });

  let created = 0;

  for (const inv of activeInvestments) {
    const value = await calculateCurrentValue(
      inv.amountInvested,
      inv.applicationDate,
      inv.yieldType,
      inv.yieldRate,
    );

    if (value !== null) {
      await prisma.investmentSnapshot.upsert({
        where: { investmentId_month: { investmentId: inv.id, month } },
        update: { value },
        create: {
          investmentId: inv.id,
          userId: inv.userId,
          month,
          value,
        },
      });
      created++;
    }
  }

  console.log(`Created ${created} investment snapshots for ${month}`);

  await prisma.systemMetric.create({
    data: {
      key: 'snapshot_creation',
      value: String(created),
      metadata: JSON.stringify({ month, timestamp: new Date().toISOString() }),
    },
  });
}
