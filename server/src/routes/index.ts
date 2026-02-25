import { Router } from 'express';
import authRoutes from './auth.routes.js';
import incomeRoutes from './income.routes.js';
import categoryRoutes from './category.routes.js';
import expenseRoutes from './expense.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import investmentRoutes from './investment.routes.js';
import rateRoutes from './rate.routes.js';
import chatRoutes from './chat.routes.js';
import adminRoutes from './admin.routes.js';
import assetRoutes from './asset.routes.js';
import scenarioRoutes from './scenario.routes.js';
import settingsRoutes from './settings.routes.js';
import marketRoutes from './market.routes.js';
import bankingRoutes from './banking.routes.js';
import notificationRoutes from './notification.routes.js';
import exportRoutes from './export.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/incomes', incomeRoutes);
router.use('/categories', categoryRoutes);
router.use('/expenses', expenseRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/investments', investmentRoutes);
router.use('/rates', rateRoutes);
router.use('/chat', chatRoutes);
router.use('/admin', adminRoutes);
router.use('/assets', assetRoutes);
router.use('/scenarios', scenarioRoutes);
router.use('/settings', settingsRoutes);
router.use('/market', marketRoutes);
router.use('/banking', bankingRoutes);
router.use('/notifications', notificationRoutes);
router.use('/export', exportRoutes);

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
