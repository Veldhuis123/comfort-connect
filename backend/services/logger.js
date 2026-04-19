/**
 * BRL 100 Audit Logger
 * Gestructureerde logging voor audit trails en compliance
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  AUDIT: 4  // Always logged - for compliance
};

const currentLevel = process.env.LOG_LEVEL 
  ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] || LOG_LEVELS.INFO
  : LOG_LEVELS.INFO;

const isProduction = process.env.NODE_ENV === 'production';

// Keys die nooit in logs mogen verschijnen (case-insensitive)
const SENSITIVE_KEYS = [
  'password', 'pass', 'pwd',
  'token', 'accesstoken', 'access_token', 'refreshtoken', 'refresh_token',
  'auth', 'authorization', 'cookie',
  'secret', 'apikey', 'api_key', 'api-key',
  'signature', 'sig',
  'iban', 'bsn',
  'creditcard', 'cvv', 'cvc',
  'sessiontoken', 'session_token',
];

const isSensitiveKey = (key) => {
  const k = String(key).toLowerCase().replace(/[-_]/g, '');
  return SENSITIVE_KEYS.some(s => k.includes(s.replace(/[-_]/g, '')));
};

/**
 * Diep filteren: vervang gevoelige waarden door ***
 */
const sanitize = (input, depth = 0) => {
  if (depth > 5) return '[max-depth]';
  if (input === null || input === undefined) return input;
  if (typeof input === 'string') {
    // Mask JWT-achtige tokens (3 base64 segmenten gescheiden door .)
    if (/^[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/.test(input)) {
      return '***JWT***';
    }
    // Mask Bearer tokens
    if (/^Bearer\s+/i.test(input)) return 'Bearer ***';
    return input;
  }
  if (typeof input !== 'object') return input;
  if (Array.isArray(input)) return input.map(v => sanitize(v, depth + 1));
  const out = {};
  for (const [k, v] of Object.entries(input)) {
    out[k] = isSensitiveKey(k) ? '***' : sanitize(v, depth + 1);
  }
  return out;
};

/**
 * Maskeer dynamische ID/token segmenten in URL paths
 * /api/quotes/sign/abc123token -> /api/quotes/sign/***
 * /api/installations/by-qr/XYZ -> /api/installations/by-qr/***
 */
const sanitizePath = (path) => {
  if (!path || typeof path !== 'string') return path;
  return path
    // Lange tokens of UUID-achtige segmenten
    .replace(/\/[A-Za-z0-9_-]{16,}/g, '/***')
    // Numerieke IDs op gevoelige routes vervangen we niet (te veel ruis)
    // UUID v4 patroon
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/***');
};

const formatTimestamp = () => new Date().toISOString();

const formatLog = (level, category, message, data = {}) => {
  // Sanitize voordat we serialiseren
  const safe = sanitize(data);
  // Verwijder undefined waarden
  const clean = Object.fromEntries(
    Object.entries(safe).filter(([, v]) => v !== undefined)
  );
  return JSON.stringify({
    timestamp: formatTimestamp(),
    level,
    category,
    message,
    ...clean
  });
};

/**
 * Extract source info from request (app vs website, IP, user-agent)
 */
const extractSource = (req) => {
  if (!req) return {};
  const ua = req.headers?.['user-agent'] || '';
  const isApp = /capacitor|ionic|mobile-app/i.test(ua) || req.headers?.['x-source'] === 'app';
  return {
    source: isApp ? 'app' : 'web',
    ip: req.ip || req.connection?.remoteAddress,
    userId: req.user?.id,
    requestId: req.requestId,
  };
};

const logger = {
  debug: (category, message, data) => {
    if (currentLevel <= LOG_LEVELS.DEBUG) {
      console.log(formatLog('DEBUG', category, message, data));
    }
  },
  
  info: (category, message, data) => {
    if (currentLevel <= LOG_LEVELS.INFO) {
      console.log(formatLog('INFO', category, message, data));
    }
  },
  
  warn: (category, message, data) => {
    if (currentLevel <= LOG_LEVELS.WARN) {
      console.warn(formatLog('WARN', category, message, data));
    }
  },
  
  error: (category, message, data) => {
    if (currentLevel <= LOG_LEVELS.ERROR) {
      // In productie: strip stack traces om interne paden niet te lekken
      const safeData = isProduction && data && typeof data === 'object'
        ? Object.fromEntries(Object.entries(data).filter(([k]) => k !== 'stack'))
        : data;
      console.error(formatLog('ERROR', category, message, safeData));
    }
  },
  
  /**
   * Audit log - ALWAYS logged regardless of level
   * Used for BRL 100 compliance tracking
   */
  audit: (action, data, req) => {
    console.log(formatLog('AUDIT', 'COMPLIANCE', action, {
      ...data,
      ...extractSource(req),
      audit_id: `AUD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }));
  },
  
  /**
   * F-Gas specific audit logging
   */
  fgas: (action, data) => {
    logger.audit(`FGAS_${action.toUpperCase()}`, {
      ...data,
      regulation: 'EU_517_2014',
      type: 'F_GAS'
    });
  },
  
  /**
   * Installation lifecycle logging
   */
  installation: (action, data) => {
    logger.audit(`INSTALLATION_${action.toUpperCase()}`, {
      ...data,
      type: 'BRL_100'
    });
  },
  
  /**
   * Request logging middleware met sanitatie van query strings en paths
   */
  requestMiddleware: (req, res, next) => {
    const start = Date.now();
    const requestId = `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    
    req.requestId = requestId;
    
    const sourceInfo = extractSource(req);
    const safePath = sanitizePath(req.path);
    
    // Filter gevoelige query keys
    let safeQuery;
    if (Object.keys(req.query).length > 0) {
      safeQuery = sanitize(req.query);
    }
    
    logger.info('HTTP', `${req.method} ${safePath}`, {
      requestId,
      method: req.method,
      path: safePath,
      query: safeQuery,
      ...sourceInfo,
    });
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logFn = res.statusCode >= 400 ? logger.warn : logger.info;
      
      logFn('HTTP', `${req.method} ${safePath} ${res.statusCode}`, {
        requestId,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        source: sourceInfo.source,
      });
    });
    
    next();
  }
};

module.exports = logger;
