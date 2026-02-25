import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as assetController from '../controllers/asset.controller.js';

const router = Router();

// Public — search assets (used in autocomplete)
router.get('/search', assetController.search);
router.get('/:id', assetController.getById);

// Protected — modify prices
router.post('/:id/price', requireAuth, assetController.updatePrice);
router.post('/prices/batch', requireAuth, assetController.updateMultiplePrices);
router.post('/', requireAuth, assetController.createAsset);

export default router;
