import { Router } from 'express';
import { googleAuth, demoLogin, getProfile, updateProfile } from '../controllers/authController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = Router();

router.post('/google', googleAuth);
router.post('/demo', demoLogin);
router.get('/profile', authenticateJWT, getProfile);
router.put('/profile', authenticateJWT, updateProfile);

export default router;
