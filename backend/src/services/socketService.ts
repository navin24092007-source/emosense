import { Server as SocketIOServer, Socket } from 'socket.io';
import { predictFrameFromBase64 } from './aiService';
import { predictWithExternalLLM, LLMVisionResponse } from './llmVisionService';
import { EmotionLog } from '../models/EmotionLog';
import { Session } from '../models/Session';

// Per-socket processing lock to prevent overlapping Gemini calls
const processingLocks = new Map<string, boolean>();

export const setupSocketIO = (io: SocketIOServer) => {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);
    processingLocks.set(socket.id, false);

    socket.on('startSession', async (data: { sessionId: string }) => {
      const { sessionId } = data;
      if (sessionId) {
        socket.join(sessionId);
        console.log(`[Socket.io] Socket ${socket.id} joined session ${sessionId}`);
        socket.emit('sessionStarted', { sessionId, status: 'active' });
      }
    });

    socket.on('frame', async (data: { sessionId: string; frame: string; engine?: string; apiKey?: string }) => {
      const { sessionId, frame, engine, apiKey } = data;
      if (!frame) return;

      // If using Gemini/OpenAI, skip frame if a previous call is still in-flight
      const useExternalLLM = engine === 'gemini' || engine === 'openai';
      if (useExternalLLM && processingLocks.get(socket.id)) {
        return; // Drop this frame — previous Gemini call still pending
      }

      console.log(`[Socket.io] Frame for session ${sessionId} (engine: ${engine || 'local'}, size: ${frame.length})`);

      try {
        if (useExternalLLM) {
          processingLocks.set(socket.id, true);
        }

        let prediction: any;

        if (useExternalLLM) {
          const resolvedKey = apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
          if (!resolvedKey) {
            socket.emit('emotionError', { message: 'No API key configured for external Vision LLM' });
            processingLocks.set(socket.id, false);
            return;
          }

          try {
            const llmResult: LLMVisionResponse = await predictWithExternalLLM(
              frame,
              resolvedKey,
              (engine as 'gemini' | 'openai') || 'auto'
            );
            prediction = {
              emotion: llmResult.emotion,
              confidence: llmResult.confidence,
              all_probs: llmResult.all_probs,
              bbox: llmResult.bbox || [30, 20, 180, 200],
              action_units: llmResult.action_units,
              compound_label: llmResult.compound_label,
              valence: llmResult.valence,
              arousal: llmResult.arousal,
              explanation: llmResult.explanation,
              model_provider: llmResult.model_provider
            };
          } catch (llmErr: any) {
            console.warn(`[Socket.io] LLM Vision failed, falling back to local: ${llmErr.message}`);
            prediction = await predictFrameFromBase64(frame);
          }

          processingLocks.set(socket.id, false);
        } else {
          // Default: use local PyTorch microservice
          prediction = await predictFrameFromBase64(frame);
        }

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
          timestamp: timestamp.toISOString(),
          action_units: prediction.action_units,
          compound_label: prediction.compound_label,
          valence: prediction.valence,
          arousal: prediction.arousal,
          explanation: prediction.explanation,
          model_provider: prediction.model_provider
        };

        // Direct emission to active sender socket (guaranteed delivery)
        socket.emit('emotionUpdate', updatePayload);

        // Also broadcast to any other clients watching this session room
        if (sessionId) {
          socket.to(sessionId).emit('emotionUpdate', updatePayload);
        }
      } catch (error: any) {
        processingLocks.set(socket.id, false);
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
      processingLocks.delete(socket.id);
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });
};
