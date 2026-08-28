import rateLimit from 'express-rate-limit';

// High-capacity rate limiter configured for real-time video streaming & telemetry
export const emotionApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1200, // 1,200 requests per minute to allow continuous live streaming without throttling
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health pings or authenticated active sessions
    return req.path === '/health' || req.method === 'OPTIONS';
  },
  message: { message: 'Too many requests to emotion endpoints, please slow down.' }
});
