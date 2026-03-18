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

const formatTimestamp = () => {
  return new Date().toISOString();
};

const formatLog = (level, category, message, data = {}) => {
  return JSON.stringify({
    timestamp: formatTimestamp(),
    level,
    category,
    message,
    ...data
  });
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
      console.error(formatLog('ERROR', category, message, data));
    }
  },
  
  /**
   * Audit log - ALWAYS logged regardless of level
   * Used for BRL 100 compliance tracking
   */
  audit: (action, data) => {
    console.log(formatLog('AUDIT', 'COMPLIANCE', action, {
      ...data,
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
   * Request logging middleware
   */
  requestMiddleware: (req, res, next) => {
    const start = Date.now();
    const requestId = `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    
    req.requestId = requestId;
    
    // Log request
    logger.info('HTTP', `${req.method} ${req.path}`, {
      requestId,
      method: req.method,
      path: req.path,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      userId: req.user?.id,
      ip: req.ip || req.connection?.remoteAddress
    });
    
    // Log response
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logFn = res.statusCode >= 400 ? logger.warn : logger.info;
      
      logFn('HTTP', `${req.method} ${req.path} ${res.statusCode}`, {
        requestId,
        statusCode: res.statusCode,
        duration: `${duration}ms`
      });
    });
    
    next();
  }
};

module.exports = logger;
