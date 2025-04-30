const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const router = express.Router();
const { findUserByUsername, verifyUserCredentials, getUserById } = require('../models/user');
const { addToTokenBlacklist, isTokenBlacklisted } = require('./authenticationHelpers');

// Get JWT secret from environment variables
const secretKey = process.env.JWT_SECRET;

// Validate required environment variables
if (!secretKey) {
  console.error('JWT_SECRET environment variable is required');
  process.exit(1);
}

const rateLimit = require('express-rate-limit');

// Rate limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { message: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  // Validate inputs
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    // Get user from database instead of static array
    const user = await findUserByUsername(username);

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Use a proper password verification function
    const isPasswordValid = await verifyUserCredentials(username, password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        username: user.username,
        iat: Math.floor(Date.now() / 1000)
      },
      secretKey,
      { expiresIn: '1h' }
    );

    // Return token and basic user info (omitting sensitive data)
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        // Include any additional non-sensitive user info
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'An error occurred during login' });
  }
});

// Middleware for verifying JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, secretKey);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

router.get('/user', authenticateToken, async (req, res) => {
  try {
    // Get user from database by ID
    const user = await getUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return user without sensitive information
    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      // Add other non-sensitive fields as needed
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving user', error: error.message });
  }
});

router.post('/logout', authenticateToken, async (req, res) => {  
  try {  
    // Add the token to a blacklist in Redis or another fast database  
    // Extract token from authorization header  
    const token = req.headers.authorization?.split(' ')[1];  
    
    if (token) {  
      // Calculate remaining time until token expiration  
      const decoded = jwt.decode(token);  
      
      // Ensure decoded contains expiration
      if (!decoded || !decoded.exp) {
        return res.status(400).json({ message: 'Invalid token' });
      }
      
      const now = Math.floor(Date.now() / 1000);
      const expiryTime = Math.max(0, decoded.exp - now);
      
      // Add to blacklist with TTL equal to remaining token lifetime  
      if (addToTokenBlacklist) {
        await addToTokenBlacklist(token, expiryTime);
      } else {
        console.warn('Token blacklist function not properly implemented');
        // Fallback implementation if needed
      }
    }  
    
    res.json({ message: 'Logged out successfully' });  
  } catch (error) {  
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Error during logout', error: error.message });  
  }  
});

module.exports = router;
