import { Schema, model, Document, Types } from 'mongoose';

export type SessionContext = 'education' | 'healthcare' | 'customer';

export interface ISession extends Document {
  userId: Types.ObjectId;
  context: SessionContext;
  startTime: Date;
  endTime?: Date;
  notes?: string;
}

const SessionSchema = new Schema<ISession>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  context: { 
    type: String, 
    enum: ['education', 'healthcare', 'customer'], 
    required: true,
    default: 'education'
  },
  startTime: { type: Date, default: Date.now, index: true },
  endTime: { type: Date },
  notes: { type: String }
});

export const Session = model<ISession>('Session', SessionSchema);
