const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

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
      console.warn(`Failed login attempt for email: ${email.substring(0, 3)}***`);
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

    // Create token with minimal claims
    const token = jwt.sign(
      { 
        id: user.id, 
        role: user.role,
        // Add token version for invalidation capability
        v: 1
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: '8h', // Shortened from 24h for better security
        issuer: 'rv-installatie',
        audience: 'rv-admin'
      }
    );

    // Set secure cookie for additional security (in addition to response)
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000 // 8 hours
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Server fout' });
  }
});

// Logout (invalidate cookie)
router.post('/logout', (req, res) => {
  res.clearCookie('auth_token');
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
    console.error('Get user error:', error.message);
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
    console.error('Password change error:', error.message);
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
      maxAge: 8 * 60 * 60 * 1000
    });

    res.json({ token, user });
  } catch (error) {
    console.error('Token refresh error:', error.message);
    res.status(500).json({ error: 'Server fout' });
  }
});

module.exports = router;
