/**
 * CSRF Protection Middleware
 * Double-submit cookie pattern voor state-changing requests
 */
const crypto = require('crypto');

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';
const TOKEN_LENGTH = 32;

/**
 * Generate a cryptographically secure CSRF token
 */
const generateToken = () => {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
};

/**
 * Middleware: set CSRF cookie op elke response als die er nog niet is
 */
const csrfCookie = (req, res, next) => {
  if (!req.cookies[CSRF_COOKIE]) {
    const token = generateToken();
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,       // Frontend moet deze kunnen lezen
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000 // 8 uur
    });
  }
  next();
};

/**
 * Middleware: verifieer CSRF token bij state-changing requests
 * Skipt GET, HEAD, OPTIONS requests
 */
const csrfProtection = (req, res, next) => {
  // Skip safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip public endpoints die geen auth nodig hebben
  // (contact form, quote request, review submit — deze worden beschermd door reCAPTCHA)
  const publicPaths = [
    '/api/contact',
    '/api/quotes',
    '/api/reviews/submit',
    '/api/auth/login'
  ];

  if (publicPaths.some(p => req.path === p || req.originalUrl === p)) {
    return next();
  }

  const cookieToken = req.cookies[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER];

  if (!cookieToken || !headerToken) {
    return res.status(403).json({ error: 'CSRF token ontbreekt' });
  }

  // Constant-time comparison to prevent timing attacks
  try {
    const cookieBuf = Buffer.from(cookieToken, 'utf8');
    const headerBuf = Buffer.from(headerToken, 'utf8');

    if (cookieBuf.length !== headerBuf.length || !crypto.timingSafeEqual(cookieBuf, headerBuf)) {
      return res.status(403).json({ error: 'Ongeldig CSRF token' });
    }
  } catch {
    return res.status(403).json({ error: 'Ongeldig CSRF token' });
  }

  next();
};

module.exports = { csrfCookie, csrfProtection, CSRF_COOKIE };
