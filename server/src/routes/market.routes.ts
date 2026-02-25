import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as marketController from '../controllers/market.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/quote/:symbol', marketController.getQuote);
router.get('/search', marketController.search);
router.get('/history/:symbol', marketController.getHistory);
router.get('/quota', marketController.getQuota);
router.post('/refresh-portfolio', marketController.refreshPortfolio);

export default router;
