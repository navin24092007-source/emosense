import rateLimit from 'express-rate-limit';

export const emotionApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // max 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests to emotion endpoints, please slow down.' }
});
