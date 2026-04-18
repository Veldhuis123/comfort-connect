require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Sentry = require('@sentry/node');

// Initialize Sentry as early as possible
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 0.1,
    // Filter noisy/expected errors
    beforeSend(event, hint) {
      const err = hint?.originalException;
      const status = err?.status || err?.statusCode;
      if (status && status >= 400 && status < 500) return null; // skip client errors
      return event;
    },
  });
}
const path = require('path');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const logger = require('./services/logger');
const { csrfCookie, csrfProtection } = require('./middleware/csrf');
const { initCronJobs } = require('./services/cron');

// Import routes
const authRoutes = require('./routes/auth');
const reviewsRoutes = require('./routes/reviews');
const quotesRoutes = require('./routes/quotes');
const contactRoutes = require('./routes/contact');
const uploadRoutes = require('./routes/upload');
const eboekhoudenRoutes = require('./routes/eboekhouden');
const productsRoutes = require('./routes/products');
const installationsRoutes = require('./routes/installations');
const pricingRoutes = require('./routes/pricing');
const wascoRoutes = require('./routes/wasco');
const serverStatusRoutes = require('./routes/server-status');
const settingsRoutes = require('./routes/settings');
const analyticsRoutes = require('./routes/analytics');
const projectsRoutes = require('./routes/projects');

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://www.google.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  // Extra security headers
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));

// Prevent clickjacking
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuten
  max: 100, // max 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS niet toegestaan'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
}));
app.use(express.json({ limit: '10mb' })); // Limit body size
app.use(cookieParser());
app.use(limiter);
app.use(csrfCookie);           // Set CSRF cookie
app.use(csrfProtection);       // Verify CSRF on state-changing requests
app.use(logger.requestMiddleware); // BRL 100 audit logging

// Static files voor uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/quotes', quotesRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/eboekhouden', eboekhoudenRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/installations', installationsRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/wasco', wascoRoutes);
app.use('/api/server-status', serverStatusRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/projects', projectsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Sentry error handler must be before any other error middleware
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// Error handling
app.use((err, req, res, next) => {
  logger.error('SERVER', 'Unhandled error', { 
    error: err.message, 
    stack: err.stack,
    requestId: req.requestId 
  });
  res.status(500).json({ error: 'Er is iets misgegaan!' });
});

// Capture uncaught exceptions and unhandled rejections
process.on('uncaughtException', (err) => {
  logger.error('SERVER', 'Uncaught exception', { error: err.message, stack: err.stack });
  if (process.env.SENTRY_DSN) Sentry.captureException(err);
});
process.on('unhandledRejection', (reason) => {
  logger.error('SERVER', 'Unhandled rejection', { reason: String(reason) });
  if (process.env.SENTRY_DSN) Sentry.captureException(reason);
});

// Start server
app.listen(PORT, () => {
  logger.info('SERVER', `Server gestart op poort ${PORT}`, { port: PORT });
  console.log(`🚀 Server draait op http://localhost:${PORT}`);
  
  // Initialize cron jobs
  initCronJobs();
});
