const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Log file path
const logFilePath = path.join(__dirname, process.env.AUDIT_LOG_PATH || 'audit-log.json');

// Middleware to log actions
const logAction = (req, res, next) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action: req.method + ' ' + req.originalUrl,
    user: req.user ? req.user.username : 'anonymous',
    body: req.body
  };

  fs.readFile(logFilePath, (err, data) => {
    let logs = [];
    if (!err) {
      logs = JSON.parse(data);
    }
    logs.push(logEntry);

    fs.writeFile(logFilePath, JSON.stringify(logs, null, 2), (err) => {
      if (err) {
        console.error('Failed to write log entry:', err);
      }
    });
  });

  next();
};

// Apply the middleware to all routes
router.use(logAction);

// Endpoint to get audit logs
router.get('/audit-logs', (req, res) => {
  fs.readFile(logFilePath, (err, data) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to read audit logs' });
    }
    res.json(JSON.parse(data));
  });
});

module.exports = router;
