import { Schema, model, Document, Types } from 'mongoose';

export type EmotionType = 'angry' | 'disgust' | 'fear' | 'happy' | 'neutral' | 'sad' | 'surprise';

export interface IEmotionLog extends Document {
  sessionId: Types.ObjectId;
  timestamp: Date;
  emotion: EmotionType;
  confidence: number;
  all_probs?: Record<string, number>;
}

const EmotionLogSchema = new Schema<IEmotionLog>({
  sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
  timestamp: { type: Date, default: Date.now, index: true },
  emotion: { 
    type: String, 
    enum: ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise'],
    required: true 
  },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  all_probs: { type: Schema.Types.Mixed }
});

export const EmotionLog = model<IEmotionLog>('EmotionLog', EmotionLogSchema);
