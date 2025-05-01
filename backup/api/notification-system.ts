import express, { Request, Response, NextFunction } from 'express';
import nodemailer from 'nodemailer';
import { WebClient } from '@slack/web-api';
import twilio from 'twilio';

const router = express.Router();

// Email configuration
if (
  !process.env.EMAIL_USER ||
  !process.env.GMAIL_CLIENT_ID ||
  !process.env.GMAIL_CLIENT_SECRET ||
  !process.env.GMAIL_REFRESH_TOKEN
) {
  console.error('Email credentials not configured. Email notifications will not work.');
}
const transporter =
  process.env.EMAIL_USER &&
  process.env.GMAIL_CLIENT_ID &&
  process.env.GMAIL_CLIENT_SECRET &&
  process.env.GMAIL_REFRESH_TOKEN
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: process.env.EMAIL_USER,
          clientId: process.env.GMAIL_CLIENT_ID,
          clientSecret: process.env.GMAIL_CLIENT_SECRET,
          refreshToken: process.env.GMAIL_REFRESH_TOKEN
        }
      })
    : null;

// Slack configuration
if (!process.env.SLACK_TOKEN) {
  console.error('Slack token not configured. Slack notifications will not work.');
}
const slackClient = process.env.SLACK_TOKEN
  ? new WebClient(process.env.SLACK_TOKEN)
  : null;

// Twilio configuration
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Endpoint to send notifications
// Middleware for validating request
const validateNotification = (req: Request, res: Response, next: NextFunction) => {
  const { type, message, recipient } = req.body;
  if (!type || !message || !recipient) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  if (!['email', 'slack', 'sms'].includes(type)) {
    return res.status(400).json({ message: 'Invalid notification type' });
  }
  next();
};

// Middleware for authentication
const authenticate = (req: Request, res: Response, next: NextFunction) => {
  // Add your authentication logic here
  // Example: Check for valid JWT token
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  // Validate token, check permissions, etc.
  next();
};

// Endpoint to send notifications
router.post(
  '/send-notification',
  authenticate,
  validateNotification,
  async (req: Request, res: Response) => {
    const { type, message, recipient } = req.body;

    try {
      if (type === 'email') {
        if (!transporter) {
          return res.status(503).json({ message: 'Email service not configured' });
        }
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: recipient,
          subject: 'Notification',
          text: message
        });
      } else if (type === 'slack') {
        if (!slackClient) {
          return res.status(503).json({ message: 'Slack service not configured' });
        }
        await slackClient.chat.postMessage({
          channel: recipient,
          text: message
        });
      } else if (type === 'sms') {
        if (!twilioClient) {
          return res.status(503).json({ message: 'SMS service not configured' });
        }
        await twilioClient.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: recipient
        });
      } else {
        return res.status(400).json({ message: 'Invalid notification type' });
      }

      res.status(200).json({ message: 'Notification sent successfully' });
    } catch (error) {
      console.error('Notification error:', error);
      res.status(500).json({ message: 'Error sending notification', error: error.message });
    }
  }
);

// Endpoint to get notifications
router.get('/notifications', async (req: Request, res: Response) => {
  // This is a placeholder for fetching notifications from a database or other storage
  res.status(200).json([]);
});

export default router;
