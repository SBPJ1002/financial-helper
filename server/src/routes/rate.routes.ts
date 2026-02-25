import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { publicLimiter } from '../middleware/rateLimiter.js';
import * as rateController from '../controllers/rate.controller.js';

const router = Router();

router.get('/public', publicLimiter, rateController.getPublic);
router.get('/current', rateController.getCurrent);
router.get('/history/:type', rateController.getHistory);
router.post('/refresh', requireAuth, rateController.refresh);

export default router;
