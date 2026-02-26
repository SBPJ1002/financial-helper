import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import * as adminController from '../controllers/admin.controller.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/users', adminController.listUsers);
router.patch('/users/:id', adminController.updateUser);
router.get('/metrics', adminController.getMetrics);
router.get('/logs', adminController.getLogs);

export default router;
