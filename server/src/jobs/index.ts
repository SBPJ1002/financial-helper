import cron from 'node-cron';
import { syncAllConnections } from '../services/pluggy.service.js';
import { isPluggyEnabled } from '../services/pluggy.service.js';
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
