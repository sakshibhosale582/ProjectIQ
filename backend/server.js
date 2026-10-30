const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');

// Load environment variables from .env file
dotenv.config();

// Step 1: Security check - Server stops immediately if JWT_SECRET is missing or empty
if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
  console.error('FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is missing or empty. Please configure it in your .env file.');
  process.exit(1);
}

// Step 2: Initialize Express application
const app = express();
// Behind a reverse proxy (Render, Nginx, ...) set TRUST_PROXY=1 so rate limiting sees real client IPs
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
const PORT = process.env.PORT || 5000;

// Step 3: Secure CORS configuration
// Restricts API access exclusively to trusted frontend origin(s)
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

// Build allowed origins set from defaults and environment variable
const buildAllowedOrigins = () => {
  const origins = new Set(defaultAllowedOrigins);
  if (process.env.FRONTEND_URL) {
    process.env.FRONTEND_URL.split(',').forEach(url => {
      const cleanUrl = url.trim().replace(/\/+$/, '');
      if (cleanUrl) origins.add(cleanUrl);
    });
  }
  return origins;
};

const allowedOriginsSet = buildAllowedOrigins();

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests with no origin (e.g. server-to-server, curl, health checks)
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.trim().replace(/\/+$/, '');
    if (allowedOriginsSet.has(normalizedOrigin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS policy violation: Origin '${origin}' is not authorized.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200,
  maxAge: 86400
};

// Security headers (API only serves JSON, so a strict CSP is safe)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors(corsOptions));
app.use('/api', require('./middleware/rateLimits').apiLimiter);

// Step 4: Parse incoming JSON request bodies
app.use(express.json({ limit: '1mb' }));

// Step 5: Connect to MongoDB database
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/projectiq')
  .then(async () => {
    console.log('MongoDB connection successfully established.');
    // A server restart interrupts background indexing: never leave a project stuck in "indexing"
    try {
      const r = await require('./models/Project').updateMany(
        { 'indexing.status': 'indexing' },
        { $set: { 'indexing.status': 'failed', 'indexing.error': 'Indexing was interrupted by a server restart. Use re-index.' } }
      );
      if (r.modifiedCount) console.log(`[Startup] Marked ${r.modifiedCount} interrupted indexing job(s) as failed.`);
    } catch (e) { console.warn('[Startup] indexing cleanup skipped:', e.message); }
  })
  .catch((err) => {
    console.error('MongoDB connection error:');
    console.error(err.message);
    console.log('Ensure MongoDB local server is running on localhost:27017');
  });

// Step 6: Connect main API routes
app.use('/api/auth', require('./routes/auth'));         // User register, login, profile
app.use('/api/projects', require('./routes/projects')); // Project upload, code scanning, AI analysis
app.use('/api/prepare', require('./routes/prepare'));   // Quiz, Viva, and Mock Interview

// Step 7: Simple health check route to verify backend is working
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ProjectIQ API',
    timestamp: new Date()
  });
});

const { errorHandler } = require('./middleware/error');

// Step 8: Global error handler - catches any unhandled errors cleanly
app.use(errorHandler);

// Step 9: Start the backend server
app.listen(PORT, () => {
  console.log(`[ProjectIQ-Server] Active on port ${PORT}`);
});
