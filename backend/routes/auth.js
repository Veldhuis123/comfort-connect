const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const logger = require('../services/logger');
const router = express.Router();

// === Token configuratie ===
const ACCESS_TOKEN_TTL_SEC = 15 * 60;            // 15 minuten
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dagen
const REFRESH_COOKIE = 'refresh_token';
const ACCESS_COOKIE = 'auth_token';
const REFRESH_PATH = '/api/auth';                // cookie alleen meegestuurd op /api/auth/*

const isProd = process.env.NODE_ENV === 'production';

const accessCookieOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'strict',
  maxAge: ACCESS_TOKEN_TTL_SEC * 1000,
  path: '/',
};

const refreshCookieOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'strict',
  maxAge: REFRESH_TOKEN_TTL_MS,
  path: REFRESH_PATH,
};

const signAccessToken = (user) => jwt.sign(
  { id: user.id, role: user.role, v: 1 },
  process.env.JWT_SECRET,
  { expiresIn: ACCESS_TOKEN_TTL_SEC, issuer: 'rv-installatie', audience: 'rv-admin' }
);

const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

// Maak een nieuw refresh-token aan en sla de hash op (rotation-ready).
// familyId hergebruiken bij rotation; bij eerste login => nieuwe familie.
const issueRefreshToken = async (userId, familyId, req) => {
  const raw = crypto.randomBytes(48).toString('hex'); // 96 hex chars
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  const ua = (req.headers['user-agent'] || '').slice(0, 255);
  const ip = (req.ip || req.connection?.remoteAddress || '').slice(0, 45);
  const [result] = await db.query(
    `INSERT INTO refresh_tokens (user_id, family_id, token_hash, expires_at, user_agent, ip)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, familyId, tokenHash, expiresAt, ua, ip]
  );
  return { raw, id: result.insertId };
};

const setAuthCookies = (res, accessToken, refreshRaw) => {
  res.cookie(ACCESS_COOKIE, accessToken, accessCookieOpts);
  res.cookie(REFRESH_COOKIE, refreshRaw, refreshCookieOpts);
};

const clearAuthCookies = (res) => {
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_PATH });
};

// Revoke alle (nog niet gerevokeerde) tokens van een familie — gebruikt bij theft-detection
const revokeFamily = async (familyId, reason) => {
  await db.query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE family_id = ? AND revoked_at IS NULL`,
    [familyId]
  );
  logger.warn('AUTH', 'Refresh token family revoked', { familyId, reason });
};

const revokeAllUserTokens = async (userId) => {
  await db.query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL`,
    [userId]
  );
};

// Rate limiting specifically for login attempts (stricter than general API limit)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuten
  max: 5, // max 5 login pogingen per 15 minuten
  message: { error: 'Te veel inlogpogingen. Probeer het over 15 minuten opnieuw.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Password strength validation
const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const errors = [];
  if (password.length < minLength) errors.push(`Minimaal ${minLength} tekens`);
  if (!hasUppercase) errors.push('Minstens één hoofdletter');
  if (!hasLowercase) errors.push('Minstens één kleine letter');
  if (!hasNumber) errors.push('Minstens één cijfer');
  if (!hasSpecial) errors.push('Minstens één speciaal teken (!@#$%^&*...)');
  
  return errors;
};

// Email validation
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

// Login with rate limiting
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email en wachtwoord zijn verplicht' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Ongeldig emailadres' });
    }

    // Use parameterized query to prevent SQL injection
    const [users] = await db.query(
      'SELECT * FROM admin_users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    // Use constant-time comparison to prevent timing attacks
    // Even if user doesn't exist, still hash a dummy password
    let user = users[0];
    let passwordToCompare = user ? user.password_hash : '$2a$10$dummyhashtopreventtimingattacks';
    
    const validPassword = await bcrypt.compare(password, passwordToCompare);

    if (!user || !validPassword) {
      // Log failed attempt (for monitoring suspicious activity)
      logger.warn('AUTH', 'Failed login attempt', { email: email.substring(0, 3) + '***' });
      return res.status(401).json({ error: 'Ongeldige inloggegevens' });
    }

    // Check if account is active (if column exists)
    if (user.is_active === false) {
      return res.status(403).json({ error: 'Account is gedeactiveerd' });
    }

    // Update last login
    await db.query(
      'UPDATE admin_users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    // Issue korte access-token + nieuw refresh-token (nieuwe familie)
    const accessToken = signAccessToken(user);
    const familyId = crypto.randomUUID();
    const { raw: refreshRaw } = await issueRefreshToken(user.id, familyId, req);
    setAuthCookies(res, accessToken, refreshRaw);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('AUTH', 'Login error', { error: error.message });
    res.status(500).json({ error: 'Server fout' });
  }
});

// Logout — revoke refresh-token familie en wis cookies
router.post('/logout', async (req, res) => {
  try {
    const raw = req.cookies?.[REFRESH_COOKIE];
    if (raw) {
      const [rows] = await db.query(
        'SELECT family_id FROM refresh_tokens WHERE token_hash = ? LIMIT 1',
        [hashToken(raw)]
      );
      if (rows.length > 0) {
        await revokeFamily(rows[0].family_id, 'logout');
      }
    }
  } catch (err) {
    logger.error('AUTH', 'Logout error', { error: err.message });
  }
  clearAuthCookies(res);
  res.json({ message: 'Uitgelogd' });
});

// Get current user - always verify from database
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, email, name, role FROM admin_users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Gebruiker niet gevonden' });
    }

    // Return fresh data from database, not from token
    res.json(users[0]);
  } catch (error) {
    logger.error('AUTH', 'Get user error', { error: error.message });
    res.status(500).json({ error: 'Server fout' });
  }
});

// Change password with validation
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Huidige en nieuwe wachtwoord zijn verplicht' });
    }

    // Validate new password strength
    const passwordErrors = validatePasswordStrength(newPassword);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Wachtwoord voldoet niet aan de eisen',
        details: passwordErrors 
      });
    }

    // Prevent reusing current password
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'Nieuwe wachtwoord moet anders zijn dan huidige' });
    }

    const [users] = await db.query(
      'SELECT password_hash FROM admin_users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Gebruiker niet gevonden' });
    }

    const validPassword = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Huidig wachtwoord is onjuist' });
    }

    // Use higher cost factor for better security
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await db.query(
      'UPDATE admin_users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [hashedPassword, req.user.id]
    );

    // Clear cookie to force re-login with new credentials
    res.clearCookie('auth_token');
    
    res.json({ message: 'Wachtwoord gewijzigd. Log opnieuw in.' });
  } catch (error) {
    logger.error('AUTH', 'Password change error', { error: error.message });
    res.status(500).json({ error: 'Server fout' });
  }
});

// Token refresh endpoint
router.post('/refresh', authMiddleware, async (req, res) => {
  try {
    // Verify user still exists and is active
    const [users] = await db.query(
      'SELECT id, email, name, role FROM admin_users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Gebruiker niet gevonden' });
    }

    const user = users[0];

    // Issue new token
    const token = jwt.sign(
      { 
        id: user.id, 
        role: user.role,
        v: 1
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: '8h',
        issuer: 'rv-installatie',
        audience: 'rv-admin'
      }
    );

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({ user });
  } catch (error) {
    logger.error('AUTH', 'Token refresh error', { error: error.message });
    res.status(500).json({ error: 'Server fout' });
  }
});

module.exports = router;
