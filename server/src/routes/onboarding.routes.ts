import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateProfileSchema } from '../validators/onboarding.validator.js';
import * as onboardingController from '../controllers/onboarding.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/profile', onboardingController.getProfile);
router.put('/profile', validate(updateProfileSchema), onboardingController.updateProfile);
router.post('/complete', onboardingController.completeOnboarding);

export default router;
