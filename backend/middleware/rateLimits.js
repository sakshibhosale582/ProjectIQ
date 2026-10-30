'use strict';
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const isProd = process.env.NODE_ENV === 'production';
// Development is intentionally generous so testing is not blocked; production is strict.
const scale = (prod, dev) => (isProd ? prod : dev);

const keyByUserOrIp = (req) => (req.user && req.user.id ? `u:${req.user.id}` : ipKeyGenerator(req.ip));

const make = ({ windowMs, prod, dev, message }) => rateLimit({
  windowMs,
  limit: scale(prod, dev),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  handler: (req, res) => res.status(429).json({ success: false, message })
});

module.exports = {
  // every /api request (cheap safety net)
  apiLimiter: make({ windowMs: 15 * 60 * 1000, prod: 600, dev: 5000, message: 'Too many requests. Please slow down and try again shortly.' }),
  // login / register (brute-force protection)
  authLimiter: make({ windowMs: 15 * 60 * 1000, prod: 20, dev: 200, message: 'Too many authentication attempts. Please try again in a few minutes.' }),
  // ZIP upload + analysis (CPU, disk and AI cost)
  uploadLimiter: make({ windowMs: 60 * 60 * 1000, prod: 10, dev: 100, message: 'Upload limit reached. Please try again later.' }),
  // anything that calls the AI model (chat, explain, quiz/viva/interview generation + evaluation)
  aiLimiter: make({ windowMs: 10 * 60 * 1000, prod: 40, dev: 400, message: 'AI request limit reached. Please wait a few minutes before trying again.' })
};
