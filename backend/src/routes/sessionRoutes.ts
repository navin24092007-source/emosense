import { Router } from 'express';
import { createSession, getSessions, getSessionDetail, endSession, cleanupSessions } from '../controllers/sessionController';
import { getSessionEmotions } from '../controllers/emotionController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateJWT);

router.post('/', createSession);
router.get('/', getSessions);
router.delete('/cleanup', cleanupSessions);
router.get('/:id', getSessionDetail);
router.post('/:id/end', endSession);
router.get('/:id/emotions', getSessionEmotions);

export default router;
