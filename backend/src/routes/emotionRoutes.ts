import { Router } from 'express';
import multer from 'multer';
import { predictImage, predictFrame, handleChatbotMessage, explainEmotionAnalysis } from '../controllers/emotionController';
import { authenticateJWT } from '../middleware/authMiddleware';
import { emotionApiLimiter } from '../middleware/rateLimiter';

const router = Router();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

router.use(emotionApiLimiter);
router.use(authenticateJWT);

router.post('/predict-image', upload.single('image'), predictImage);
router.post('/predict-frame', predictFrame);
router.post('/chat', handleChatbotMessage);
router.post('/explain', explainEmotionAnalysis);

export default router;

