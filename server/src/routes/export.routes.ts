import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as exportController from '../controllers/export.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', exportController.exportData);

export default router;
