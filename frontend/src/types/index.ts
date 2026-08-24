export type UserRole = 'student' | 'teacher' | 'therapist' | 'agent' | 'admin';
export type SessionContext = 'education' | 'healthcare' | 'customer';
export type EmotionType = 'angry' | 'disgust' | 'fear' | 'happy' | 'neutral' | 'sad' | 'surprise';

export interface User {
  _id: string;
  name: string;
  email: string;
  googleId?: string;
  role: UserRole;
  autoDeleteDays: number;
  createdAt: string;
}

export interface Session {
  _id: string;
  userId: string;
  context: SessionContext;
  startTime: string;
  endTime?: string;
  notes?: string;
  logCount?: number;
  dominantEmotion?: EmotionType;
  durationSeconds?: number;
}

export interface EmotionLog {
  _id?: string;
  sessionId: string;
  timestamp: string;
  emotion: EmotionType;
  confidence: number;
  all_probs?: Record<EmotionType, number>;
}

export interface EmotionPrediction {
  emotion: EmotionType;
  confidence: number;
  all_probs: Record<EmotionType, number>;
  bbox: [number, number, number, number];
  timestamp?: string;
}

export interface SessionAnalytics {
  totalLogs: number;
  dominantEmotion: EmotionType;
  distribution: Record<EmotionType, number>;
  variability: 'low' | 'medium' | 'high';
  transitionRate: number;
}

export interface AffectivePlane {
  valence: number;
  arousal: number;
  valenceLabel: string;
  arousalLabel: string;
}

export interface EmotionExplanation {
  emotion: EmotionType;
  confidence: number;
  context: SessionContext;
  summary: string;
  facialCues: string[];
  domainInsight: string;
  recommendations: string[];
  affectivePlane: AffectivePlane;
  variability?: 'low' | 'medium' | 'high';
  timestamp?: string;
}
