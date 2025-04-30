const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const router = express.Router();
const { findUserByUsername, verifyUserCredentials } = require('../models/user');

// Get JWT secret from environment variables
const secretKey = process.env.JWT_SECRET;

// Validate required environment variables
if (!secretKey) {
  console.error('JWT_SECRET environment variable is required');
  process.exit(1);
}

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Validate inputs
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

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

  const token = jwt.sign({ id: user.id, role: user.role }, secretKey, { expiresIn: '1h' });

  // Return token and basic user info (omitting sensitive data)
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    }
  });
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
        const expiryTime = decoded.exp - Math.floor(Date.now() / 1000);  
        
        // Add to blacklist with TTL equal to remaining token lifetime  
        await addToTokenBlacklist(token, expiryTime);  
      }  
      
      res.json({ message: 'Logged out successfully' });  
    } catch (error) {  
      res.status(500).json({ message: 'Error during logout', error: error.message });  
    }  
  });  

module.exports = router;
