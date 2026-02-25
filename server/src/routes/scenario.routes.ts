import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as scenarioController from '../controllers/scenario.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', scenarioController.list);
router.get('/:id', scenarioController.getById);
router.post('/', scenarioController.create);
router.put('/:id', scenarioController.update);
router.delete('/:id', scenarioController.remove);
router.post('/:id/duplicate', scenarioController.duplicate);

export default router;
