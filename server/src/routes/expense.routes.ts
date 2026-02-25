import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createExpenseSchema,
  updateExpenseSchema,
  expenseHistorySchema,
  expenseGoalSchema,
} from '../validators/expense.validator.js';
import * as expenseController from '../controllers/expense.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', expenseController.list);
router.get('/projections', expenseController.getProjections);
router.post('/:id/generate-recurring', expenseController.generateRecurring);
router.delete('/:id/future', expenseController.deleteFuture);
router.put('/:id/future-amount', expenseController.updateFutureAmount);
router.put('/:id/toggle-type', expenseController.toggleType);
router.get('/:id', expenseController.getById);
router.post('/', validate(createExpenseSchema), expenseController.create);
router.put('/:id', validate(updateExpenseSchema), expenseController.update);
router.delete('/:id', expenseController.remove);

// History
router.get('/:id/history', expenseController.getHistory);
router.post('/:id/history', validate(expenseHistorySchema), expenseController.addHistory);

// Goals
router.put('/:id/goal', validate(expenseGoalSchema), expenseController.setGoal);
router.delete('/:id/goal', expenseController.removeGoal);

export default router;
