import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createIncomeSchema, updateIncomeSchema } from '../validators/income.validator.js';
import * as incomeController from '../controllers/income.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', incomeController.list);
router.post('/', validate(createIncomeSchema), incomeController.create);
router.put('/:id', validate(updateIncomeSchema), incomeController.update);
router.delete('/:id', incomeController.remove);

export default router;
