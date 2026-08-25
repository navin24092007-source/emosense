import { Router } from 'express';
import { register, login, googleAuth, demoLogin, getProfile, updateProfile } from '../controllers/authController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = Router();

// Email/password auth — saves to MongoDB
router.post('/register', register);
router.post('/login',    login);

// Google OAuth
router.post('/google', googleAuth);

// Legacy demo login (kept for fallback)
router.post('/demo', demoLogin);

// Protected profile routes
router.get('/profile',  authenticateJWT, getProfile);
router.put('/profile',  authenticateJWT, updateProfile);

export default router;
