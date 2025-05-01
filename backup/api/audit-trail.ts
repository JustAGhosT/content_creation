import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { authenticateUser } from './authenticationHelpers';

const router = express.Router();

interface LogEntry {
  action: string;
  user: string;
  body: any;
}

// Helper function to sanitize sensitive data from request body
function sanitizeRequestBody(body: any): any {
  if (!body) return null;

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) sanitized[field] = '***REDACTED***';
  });

  return sanitized;
}

// Log file path
const logFilePath: string = path.join(__dirname, process.env.AUDIT_LOG_PATH || 'audit-log.json');

// Middleware to log actions
const logAction = async (req: Request, res: Response, next: NextFunction) => {
  const logEntry: LogEntry = {
    action: req.method + ' ' + req.originalUrl,
    user: req.user ? req.user.username : 'anonymous',
    body: sanitizeRequestBody(req.body),
  };

  const writeLogEntry = async () => {
    try {
      let logs: LogEntry[] = [];
      // Ensure directory exists
      const dir: string = path.dirname(logFilePath);
      try {
        await fs.promises.mkdir(dir, { recursive: true });
      } catch (mkdirErr) {
        // Directory creation failed
        console.error('Failed to create log directory:', mkdirErr);
        return;
      }

      // Read existing logs if file exists
      try {
        if (fs.existsSync(logFilePath)) {
          const data: string = await fs.promises.readFile(logFilePath, 'utf-8');
          logs = JSON.parse(data);
        }
      } catch (readErr) {
        console.error('Failed to read or parse log file:', readErr);
        // Continue with empty logs array
      }

      logs.push(logEntry);

      try {
        await fs.promises.writeFile(logFilePath, JSON.stringify(logs, null, 2));
      } catch (writeErr) {
        console.error('Failed to write log entry:', writeErr);
      }
    } catch (err) {
      console.error('Unexpected error in writeLogEntry:', err);
    }
  };

  await writeLogEntry();
  next();
};

// Apply the middleware to all routes
router.use(logAction);

// Endpoint to get audit logs
router.get('/audit-logs', authenticateUser, (req: Request, res: Response) => {
  fs.readFile(logFilePath, (err: NodeJS.ErrnoException | null, data: Buffer) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to read audit logs' });
    }
    res.json(JSON.parse(data.toString()));
  });
});

export default router;
