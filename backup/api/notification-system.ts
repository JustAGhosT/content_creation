import { WebClient } from '@slack/web-api';
import express, { NextFunction, Request, Response } from 'express';
import nodemailer from 'nodemailer';
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
 if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
   console.error('Twilio credentials not configured. SMS notifications will not work.');
 }
 const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
   ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
   : null;

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
 async function sendEmailNotification(recipient: string, message: string) {
   if (!transporter) {
     throw new Error('Email service not configured');
   }
   return transporter.sendMail({
     from: process.env.EMAIL_USER,
     to: recipient,
     subject: 'Notification',
     text: message
   });
 }

 async function sendSlackNotification(recipient: string, message: string) {
   if (!slackClient) {
     throw new Error('Slack service not configured');
   }
   return slackClient.chat.postMessage({
     channel: recipient,
     text: message
   });
 }

 async function sendSmsNotification(recipient: string, message: string) {
   if (!twilioClient) {
     throw new Error('SMS service not configured');
   }
   return twilioClient.messages.create({
     body: message,
     from: process.env.TWILIO_PHONE_NUMBER,
     to: recipient
   });
 }

router.post(
  '/send-notification',
  authenticate,
  validateNotification,
  async (req: Request, res: Response) => {
    const { type, message, recipient } = req.body;

    try {
      switch (type) {
        case 'email':
          try {
            await sendEmailNotification(recipient, message);
          } catch (error) {
            return res.status(503).json({ message: 'Email service not configured' });
          }
          break;
        case 'slack':
          try {
            await sendSlackNotification(recipient, message);
          } catch (error) {
            return res.status(503).json({ message: 'Slack service not configured' });
          }
          break;
        case 'sms':
          try {
            await sendSmsNotification(recipient, message);
          } catch (error) {
            return res.status(503).json({ message: 'SMS service not configured' });
          }
          break;
        default:
          return res.status(400).json({ message: 'Invalid notification type' });
      }

      res.status(200).json({ message: 'Notification sent successfully' });
    } catch (error) {
      console.error('Notification error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Error sending notification', error: errorMessage });
    }
  }
);
  }
);

// Endpoint to get notifications
router.get('/notifications', async (req: Request, res: Response) => {
  // This is a placeholder for fetching notifications from a database or other storage
  res.status(200).json([]);
});

export default router;
