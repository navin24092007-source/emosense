import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes';
import sessionRoutes from './routes/sessionRoutes';
import emotionRoutes from './routes/emotionRoutes';
import { setupSocketIO } from './services/socketService';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/emosense';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Socket.io initialization with CORS
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// API Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'EmoSense Express Backend',
    dbState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/emotions', emotionRoutes);

// Setup Socket.io
setupSocketIO(io);

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`[MongoDB] Connected successfully to ${MONGODB_URI}`);
  } catch (err: any) {
    console.warn(`[MongoDB] Local connection failed: ${err.message}. Spinning up in-memory MongoDB...`);
    try {
      const mongoServer = await MongoMemoryServer.create();
      const memoryUri = mongoServer.getUri();
      await mongoose.connect(memoryUri);
      console.log(`[MongoDB] Connected to IN-MEMORY database at ${memoryUri}`);
    } catch (memErr) {
      console.error(`[MongoDB] Failed to start in-memory db:`, memErr);
    }
  }
};
connectDB();

// Start Server
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`[EmoSense Backend] Server running on http://localhost:${PORT}`);
  });
}

export { app, server };
