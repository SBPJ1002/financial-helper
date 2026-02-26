import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createDeclarationSchema,
  updateDeclarationSchema,
  bulkCreateDeclarationsSchema,
} from '../validators/declaration.validator.js';
import * as declarationController from '../controllers/declaration.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', declarationController.list);
router.get('/match/:month', declarationController.getMatchResults);
router.get('/:id', declarationController.getById);
router.post('/', validate(createDeclarationSchema), declarationController.create);
router.post('/bulk', validate(bulkCreateDeclarationsSchema), declarationController.bulkCreate);
router.post('/match', declarationController.triggerMatching);
router.put('/:id', validate(updateDeclarationSchema), declarationController.update);
router.delete('/:id', declarationController.remove);

export default router;
