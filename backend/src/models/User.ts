import { Schema, model, Document } from 'mongoose';

export type UserRole = 'student' | 'teacher' | 'therapist' | 'agent' | 'admin';

export interface IUser extends Document {
  name: string;
  email: string;
  googleId?: string;
  password?: string;        // hashed password for email/password auth
  role: UserRole;
  autoDeleteDays: number;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true, index: true },
  googleId: { type: String, sparse: true },
  password: { type: String, select: false }, // never returned in queries unless explicitly selected
  role: {
    type: String,
    enum: ['student', 'teacher', 'therapist', 'agent', 'admin'],
    default: 'student'
  },
  autoDeleteDays: { type: Number, default: 30 },
  createdAt:      { type: Date, default: Date.now }
});

export const User = model<IUser>('User', UserSchema);
