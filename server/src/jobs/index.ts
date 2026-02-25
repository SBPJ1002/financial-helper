import cron from 'node-cron';
import { fetchAndStoreRates } from '../services/bcb.service.js';
import { createMonthlySnapshots } from './snapshotCreator.job.js';
import { syncAllConnections } from '../services/pluggy.service.js';
import { isPluggyEnabled } from '../services/pluggy.service.js';
import { isAlphaVantageEnabled, updatePortfolioPrices } from '../services/marketData.service.js';
import { generateNotifications } from '../services/notification.service.js';
import { prisma } from '../config/prisma.js';

export function startAllJobs() {
  // Daily at 06:00 UTC — Pluggy sync (if enabled)
  cron.schedule('0 6 * * *', async () => {
    if (!isPluggyEnabled()) return;
    try {
      await syncAllConnections();
    } catch (err) {
      console.error('Pluggy sync job error:', err);
    }
  });
  console.log('Pluggy sync cron job scheduled (daily at 06:00 UTC)');

  // Daily at 08:00 — BCB rates
  cron.schedule('0 8 * * *', async () => {
    try {
      await fetchAndStoreRates();
    } catch (err) {
      console.error('Rate fetcher job error:', err);
    }
  });
  console.log('Rate fetcher cron job scheduled (daily at 08:00)');

  // Weekdays at 21:30 UTC — Stock prices (if Alpha Vantage configured)
  cron.schedule('30 21 * * 1-5', async () => {
    if (!isAlphaVantageEnabled()) return;
    try {
      const result = await updatePortfolioPrices();
      console.log(`Updated ${result.updated} portfolio prices`);
    } catch (err) {
      console.error('Stock price update job error:', err);
    }
  });
  console.log('Stock price update cron job scheduled (weekdays at 21:30 UTC)');

  // Monthly on the 1st at 00:30 — Investment snapshots
  cron.schedule('30 0 1 * *', async () => {
    try {
      await createMonthlySnapshots();
    } catch (err) {
      console.error('Snapshot creator job error:', err);
    }
  });
  console.log('Snapshot creator cron job scheduled (1st of every month at 00:30)');

  // Daily at 07:00 — Notifications
  cron.schedule('0 7 * * *', async () => {
    try {
      await generateNotifications();
      console.log('Notifications generated successfully');
    } catch (err) {
      console.error('Notification generation error:', err);
    }
  });
  console.log('Notification cron job scheduled (daily at 07:00)');

  // Weekly Sunday at 03:00 — Cleanup
  cron.schedule('0 3 * * 0', async () => {
    try {
      // Delete expired sessions
      const expiredSessions = await prisma.session.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      console.log(`Cleaned up ${expiredSessions.count} expired sessions`);

      // Delete old system metrics (90+ days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const oldMetrics = await prisma.systemMetric.deleteMany({
        where: { createdAt: { lt: ninetyDaysAgo } },
      });
      console.log(`Cleaned up ${oldMetrics.count} old system metrics`);
    } catch (err) {
      console.error('Cleanup job error:', err);
    }
  });
  console.log('Cleanup cron job scheduled (weekly Sunday at 03:00)');
}
