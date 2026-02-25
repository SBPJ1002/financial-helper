import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createInvestmentSchema, updateInvestmentSchema } from '../validators/investment.validator.js';
import * as investmentController from '../controllers/investment.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', investmentController.list);
router.get('/summary', investmentController.getSummary);
router.get('/types', investmentController.getTypes);
router.get('/:id', investmentController.getById);
router.post('/', validate(createInvestmentSchema), investmentController.create);
router.put('/:id', validate(updateInvestmentSchema), investmentController.update);
router.delete('/:id', investmentController.remove);

export default router;
