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

// Achter Nginx reverse proxy — vertrouw 1 hop voor correcte client-IP
// (anders weigert express-rate-limit de X-Forwarded-For header).
app.set('trust proxy', 1);

// Security headers
// LET OP: De productie-CSP wordt beheerd door Nginx (scripts/install-csp.sh)
// met per-request nonces. Deze helmet CSP is een fallback voor directe
// backend-responses (API, /uploads) — die hebben geen inline scripts nodig,
// dus we kunnen 'unsafe-inline' voor scripts hier ook weglaten.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      scriptSrcElem: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: [
        "'self'",
        "https://*.sentry.io",
        "https://*.ingest.sentry.io",
        "https://*.ingest.de.sentry.io",
        "https://static.cloudflareinsights.com",
        "https://nominatim.openstreetmap.org",
        "https://*.tile.openstreetmap.org",
      ],
      frameSrc: ["'self'", "https://www.google.com"],
      workerSrc: ["'self'", "blob:"],
      mediaSrc: ["'self'", "blob:", "data:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
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

// Rate limiting — ruime limiet voor normaal verkeer; health-check uitgesloten
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuten
  max: 1000, // max 1000 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health' || req.path === '/api/server-status',
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

// Health check — vóór CSRF/limiter, lichtgewicht voor uptime monitoring
// /api/health           → snelle liveness (alleen process)
// /api/health?deep=1    → DB + SMTP probe (langzamer, voor monitoring)
const db = require('./config/database');
const nodemailer = require('nodemailer');

app.get('/api/health', async (req, res) => {
  const started = Date.now();
  const result = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    version: process.env.APP_VERSION || 'unknown',
  };

  if (req.query.deep === '1' || req.query.deep === 'true') {
    const checks = { db: { ok: false }, smtp: { ok: false } };

    // DB check (timeout 2s)
    try {
      const t0 = Date.now();
      await Promise.race([
        db.query('SELECT 1'),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2000)),
      ]);
      checks.db = { ok: true, latencyMs: Date.now() - t0 };
    } catch (e) {
      checks.db = { ok: false, error: e.message };
    }

    // SMTP check (timeout 3s) — alleen verify, verstuurt geen mail
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const t0 = Date.now();
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.transip.email',
          port: parseInt(process.env.SMTP_PORT) || 465,
          secure: process.env.SMTP_SECURE !== 'false',
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
          connectionTimeout: 3000,
          greetingTimeout: 3000,
          socketTimeout: 3000,
        });
        await transporter.verify();
        checks.smtp = { ok: true, latencyMs: Date.now() - t0 };
      } catch (e) {
        checks.smtp = { ok: false, error: e.message };
      }
    } else {
      checks.smtp = { ok: false, error: 'not_configured' };
    }

    result.checks = checks;
    result.status = checks.db.ok && checks.smtp.ok ? 'ok' : 'degraded';
    result.totalMs = Date.now() - started;
    return res.status(checks.db.ok ? 200 : 503).json(result);
  }

  res.json(result);
});
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
