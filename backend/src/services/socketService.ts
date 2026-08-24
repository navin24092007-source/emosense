import { Server as SocketIOServer, Socket } from 'socket.io';
import { predictFrameFromBase64 } from './aiService';
import { EmotionLog } from '../models/EmotionLog';
import { Session } from '../models/Session';

export const setupSocketIO = (io: SocketIOServer) => {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    socket.on('startSession', async (data: { sessionId: string }) => {
      const { sessionId } = data;
      if (sessionId) {
        socket.join(sessionId);
        console.log(`[Socket.io] Socket ${socket.id} joined session ${sessionId}`);
        socket.emit('sessionStarted', { sessionId, status: 'active' });
      }
    });

    socket.on('frame', async (data: { sessionId: string; frame: string }) => {
      const { sessionId, frame } = data;
      if (!frame) return;
      
      console.log(`[Socket.io] Received frame for session ${sessionId} (size: ${frame.length} chars)`);

      try {
        const prediction = await predictFrameFromBase64(frame);
        const timestamp = new Date();

        // Save log asynchronously to DB if valid sessionId and face is detected
        if (sessionId && prediction.emotion !== 'no_face') {
          EmotionLog.create({
            sessionId,
            timestamp,
            emotion: prediction.emotion,
            confidence: prediction.confidence,
            all_probs: prediction.all_probs
          }).catch(err => console.error('[Socket.io] DB Log save error:', err.message));
        }

        const updatePayload = {
          sessionId,
          emotion: prediction.emotion,
          confidence: prediction.confidence,
          all_probs: prediction.all_probs,
          bbox: prediction.bbox,
          timestamp: timestamp.toISOString()
        };

        // Broadcast to all clients watching this session (and reply to sender)
        if (sessionId) {
          io.to(sessionId).emit('emotionUpdate', updatePayload);
        } else {
          socket.emit('emotionUpdate', updatePayload);
        }
      } catch (error: any) {
        socket.emit('emotionError', { message: 'Frame analysis failed', error: error.message });
      }
    });

    socket.on('stopSession', (data: { sessionId: string }) => {
      const { sessionId } = data;
      if (sessionId) {
        socket.leave(sessionId);
        console.log(`[Socket.io] Socket ${socket.id} left session ${sessionId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });
};
