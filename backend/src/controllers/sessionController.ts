import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { Session, ISession, SessionContext } from '../models/Session';
import { EmotionLog } from '../models/EmotionLog';
import { User } from '../models/User';

export const createSession = async (req: AuthRequest, res: Response) => {
  try {
    const { context, notes } = req.body;
    const sessionContext: SessionContext = context || 'education';

    const session = await Session.create({
      userId: req.user?.id,
      context: sessionContext,
      startTime: new Date(),
      notes: notes || ''
    });

    return res.status(201).json(session);
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to create session', error: error.message });
  }
};

export const getSessions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const sessions = await Session.find({ userId }).sort({ startTime: -1 }).lean();

    // Enrich sessions with dominant emotion and log counts
    const enrichedSessions = await Promise.all(sessions.map(async (sess) => {
      const logs = await EmotionLog.find({ sessionId: sess._id }).lean();
      
      const counts: Record<string, number> = {};
      logs.forEach(l => {
        counts[l.emotion] = (counts[l.emotion] || 0) + 1;
      });

      let dominantEmotion = 'neutral';
      let maxCount = 0;
      Object.entries(counts).forEach(([emo, count]) => {
        if (count > maxCount) {
          maxCount = count;
          dominantEmotion = emo;
        }
      });

      const durationMs = sess.endTime 
        ? new Date(sess.endTime).getTime() - new Date(sess.startTime).getTime()
        : logs.length > 0 
          ? new Date(logs[logs.length - 1].timestamp).getTime() - new Date(sess.startTime).getTime()
          : 0;

      return {
        ...sess,
        logCount: logs.length,
        dominantEmotion,
        durationSeconds: Math.round(durationMs / 1000)
      };
    }));

    return res.json(enrichedSessions);
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch sessions', error: error.message });
  }
};

export const getSessionDetail = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const session = await Session.findById(id).lean();
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const logs = await EmotionLog.find({ sessionId: id }).sort({ timestamp: 1 }).lean();

    // Compute Emotion Distribution
    const distribution: Record<string, number> = {
      angry: 0, disgust: 0, fear: 0, happy: 0, neutral: 0, sad: 0, surprise: 0
    };
    logs.forEach(l => {
      if (distribution[l.emotion] !== undefined) {
        distribution[l.emotion]++;
      }
    });

    // Compute Dominant Emotion
    let dominantEmotion = 'neutral';
    let maxVal = 0;
    Object.entries(distribution).forEach(([emo, val]) => {
      if (val > maxVal) {
        maxVal = val;
        dominantEmotion = emo;
      }
    });

    // Compute Variability (Entropy / Transitions)
    let transitions = 0;
    for (let i = 1; i < logs.length; i++) {
      if (logs[i].emotion !== logs[i - 1].emotion) {
        transitions++;
      }
    }
    const transitionRate = logs.length > 1 ? transitions / (logs.length - 1) : 0;
    let variability: 'low' | 'medium' | 'high' = 'low';
    if (transitionRate > 0.4) variability = 'high';
    else if (transitionRate > 0.15) variability = 'medium';

    return res.json({
      session,
      logs,
      analytics: {
        totalLogs: logs.length,
        dominantEmotion,
        distribution,
        variability,
        transitionRate: Math.round(transitionRate * 100) / 100
      }
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch session detail', error: error.message });
  }
};

export const endSession = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    session.endTime = new Date();
    await session.save();
    return res.json({ message: 'Session ended successfully', session });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to end session', error: error.message });
  }
};

export const cleanupSessions = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id);
    const autoDeleteDays = user?.autoDeleteDays || 30;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - autoDeleteDays);

    const expiredSessions = await Session.find({ userId: req.user?.id, startTime: { $lt: cutoffDate } });
    const expiredIds = expiredSessions.map(s => s._id);

    await EmotionLog.deleteMany({ sessionId: { $in: expiredIds } });
    const result = await Session.deleteMany({ _id: { $in: expiredIds } });

    return res.json({
      message: `Cleaned up ${result.deletedCount} sessions older than ${autoDeleteDays} days`,
      deletedCount: result.deletedCount
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Cleanup failed', error: error.message });
  }
};
