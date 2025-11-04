// server/middleware/rateLimit.js
import rateLimit from 'express-rate-limit';
export const apiLimiter = rateLimit({
windowMs: 15 * 60 * 1000, // 15 minutes
max: 100, // Max 100 requests per window
message: 'Too many requests, please try again later'
});
export const authLimiter = rateLimit({
windowMs: 15 * 60 * 1000,
max: 5, // Max 5 login attempts per window
message: 'Too many login attempts, please try again later'
});
