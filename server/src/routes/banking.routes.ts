import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { bulkRenameSchema, renameItemSchema } from '../validators/importReview.validator.js';
import * as bankingController from '../controllers/banking.controller.js';
import * as importReviewController from '../controllers/importReview.controller.js';

const router = Router();

router.get('/available', bankingController.checkAvailability);

router.use(requireAuth);

router.post('/connect-token', bankingController.createConnectToken);
router.get('/connections', bankingController.listConnections);
router.post('/connections', bankingController.createConnection);
router.delete('/connections/:id', bankingController.deleteConnection);
router.post('/connections/:id/sync', bankingController.syncConnection);
router.get('/accounts', bankingController.listAccounts);
router.get('/transactions', bankingController.listTransactions);
router.post('/import', bankingController.importTransactions);

// Import review endpoints
router.get('/import/:batchId', importReviewController.getImportBatch);
router.put('/import/bulk-rename', validate(bulkRenameSchema), importReviewController.bulkRename);
router.put('/import/toggle-type/:id', importReviewController.toggleExpenseType);
router.put('/import/rename', validate(renameItemSchema), importReviewController.renameItem);

export default router;
