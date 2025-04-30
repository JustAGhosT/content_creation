const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { authenticateUser } = require('./authenticationHelpers');

// Helper function to sanitize sensitive data from request body  
function sanitizeRequestBody(body) {  
  if (!body) return null;  
  
  const sanitized = { ...body };  
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];  
  
  sensitiveFields.forEach(field => {  
    if (sanitized[field]) sanitized[field] = '***REDACTED***';  
  });  
  
  return sanitized;  
}  

// Log file path
const logFilePath = path.join(__dirname, process.env.AUDIT_LOG_PATH || 'audit-log.json');

// Middleware to log actions
const logAction = async (req, res, next) => {
  // Marking unused variables to avoid warnings
  void res;
  void next;
  const logEntry = {
    action: req.method + ' ' + req.originalUrl,
    user: req.user ? req.user.username : 'anonymous',
    body: sanitizeRequestBody(req.body),
  };

  const writeLogEntry = async () => {
    try {
      let logs = [];
      // Check if file exists before reading
      if (fs.existsSync(logFilePath)) {
        try {
          const data = await fs.promises.readFile(logFilePath, 'utf-8');
          logs = JSON.parse(data);
        } catch (parseErr) {
          console.error('Failed to parse log file:', parseErr);
          // Continue with empty logs array
        }
      } else {
        // Create directory if it doesn't exist
        const dir = path.dirname(logFilePath);
        if (!fs.existsSync(dir)) {
          await fs.promises.mkdir(dir, { recursive: true });
        }
      }

      logs.push(logEntry);

      // Write asynchronously to prevent blocking
      await fs.promises.writeFile(logFilePath, JSON.stringify(logs, null, 2));
    } catch (err) {
      console.error('Failed to write log entry:', err);
    }
  };

  await writeLogEntry();
  next();
};

// Apply the middleware to all routes
router.use(logAction);

// Endpoint to get audit logs
router.get('/audit-logs', authenticateUser, (req, res) => {  
  fs.readFile(logFilePath, (err, data) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to read audit logs' });
    }
    res.json(JSON.parse(data));
  });
});

module.exports = router;
