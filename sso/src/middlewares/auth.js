const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/User');
const Session = require('../models/Session');

// Middleware to authenticate users
exports.authenticate = async (req, res, next) => {
  try {
    // Check development mode flag (set NODE_ENV=development)
    const isDevelopment = process.env.NODE_ENV === 'development';
    const skipAuth = process.env.SKIP_AUTH === 'true';
    
    // Allow bypassing authentication in development mode for testing
    if (isDevelopment && skipAuth) {
      console.log('DEVELOPMENT MODE: Authentication skipped');
      // Set a default admin user for development
      req.user = { id: 1, username: 'admin', role: 'admin' };
      return next();
    }
    
    // Get token from cookies (preferred) or request headers
    let token = null;
    
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log('Found token in cookies');
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('Found token in Authorization header');
    }
    
    if (!token) {
      console.log('No token found in request');
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }
    
    // First verify JWT token without checking database
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
      console.log('JWT token verified successfully, user ID:', decoded.id);
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      // Clear invalid cookie token if present
      if (req.cookies && req.cookies.token) {
        console.log('Clearing invalid token cookie');
        res.clearCookie('token', { path: '/' });
      }
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }
    
    // Get user from database using the ID from JWT
    const user = await User.findById(decoded.id);
    
    if (!user) {
      console.log('User not found for ID:', decoded.id);
      // Clear invalid cookie token if present
      if (req.cookies && req.cookies.token) {
        res.clearCookie('token', { path: '/' });
      }
      return res.status(401).json({ error: 'Unauthorized - Invalid user' });
    }
    
    console.log('User authenticated:', user.username, 'with role:', user.role);
    
    // Then verify session in database (but don't fail if session not found)
    // This is useful for cleaning up sessions but not essential for security
    try {
      const isValidSession = await Session.isValid(token);
      if (!isValidSession) {
        console.log(`Warning: Valid JWT but session not found in DB for user ${user.id}`);
        // Create a session for this token to fix the issue
        await Session.create(user.id, 24, token); 
        console.log('Created new session for existing token');
      }
    } catch (sessionError) {
      console.error('Session validation error:', sessionError);
      // Continue despite session error
    }
    
    // Set user and token in request object
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    // Clear invalid cookie token if present
    if (req.cookies && req.cookies.token) {
      res.clearCookie('token', { path: '/' });
    }
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
};

// Middleware to check if user is admin
exports.isAdmin = (req, res, next) => {
  // Skip in development if flag is set
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
    console.log('DEVELOPMENT MODE: Admin check skipped');
    return next();
  }
  
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }
  
  next();
};

// Middleware to check if user is staff or admin
exports.isStaff = (req, res, next) => {
  // Skip in development if flag is set
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
    console.log('DEVELOPMENT MODE: Staff check skipped');
    return next();
  }
  
  if (!req.user || (req.user.role !== 'staff' && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'Forbidden - Staff access required' });
  }
  
  next();
};

// Middleware to check if user is accessing their own data
exports.isSameUser = (req, res, next) => {
  // Skip in development if flag is set
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
    console.log('DEVELOPMENT MODE: User check skipped');
    return next();
  }
  
  const userId = parseInt(req.params.id || req.params.userId);
  
  if (!req.user || (req.user.id !== userId && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'Forbidden - Not authorized to access this user data' });
  }
  
  next();
}; 