const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // Check Authorization header first, then cookie
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.auth_token;
  
  let token = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (cookieToken) {
    token = cookieToken;
  }

  if (!token) {
    return res.status(401).json({ error: 'Geen toegang - token ontbreekt' });
  }

  try {
    // Verify with issuer and audience for additional security
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'rv-installatie',
      audience: 'rv-admin'
    });
    
    // Check token version if needed for invalidation
    if (decoded.v === undefined || decoded.v < 1) {
      return res.status(401).json({ error: 'Token is verlopen - log opnieuw in' });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Sessie verlopen - log opnieuw in' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Ongeldige token' });
    }
    return res.status(401).json({ error: 'Authenticatie mislukt' });
  }
};

const adminMiddleware = (req, res, next) => {
  // Always check from database for critical operations instead of trusting token
  // For now, trust token but log for auditing
  if (req.user.role !== 'admin') {
    console.warn(`Unauthorized admin access attempt by user ${req.user.id}`);
    return res.status(403).json({ error: 'Geen admin rechten' });
  }
  next();
};

// Middleware to verify user is still active (for sensitive operations)
const verifyActiveUser = (db) => async (req, res, next) => {
  try {
    const [users] = await db.query(
      'SELECT id, is_active FROM admin_users WHERE id = ?',
      [req.user.id]
    );
    
    if (users.length === 0 || users[0].is_active === false) {
      return res.status(403).json({ error: 'Account is niet actief' });
    }
    
    next();
  } catch (error) {
    console.error('User verification error:', error.message);
    return res.status(500).json({ error: 'Server fout' });
  }
};

module.exports = { authMiddleware, adminMiddleware, verifyActiveUser };
