import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { sendMessageSchema } from '../validators/chat.validator.js';
import * as chatController from '../controllers/chat.controller.js';

const router = Router();

router.use(requireAuth);

router.post('/send', aiLimiter, validate(sendMessageSchema), chatController.send);
router.get('/history', chatController.getHistory);
router.delete('/history', chatController.clearHistory);

export default router;
