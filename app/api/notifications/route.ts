import { NextResponse } from 'next/server';
import { withErrorHandling, Errors } from '../_utils/errors';
import { isAuthenticated } from '../_utils/auth';
import { createLogEntry, logToAuditTrail } from '../_utils/audit';
import { validateString, validateEnum } from '../_utils/validation';
import nodemailer from 'nodemailer';
import { WebClient } from '@slack/web-api';
import twilio from 'twilio';

// Import feature flags
// Note: Adjust the import path as needed for your project structure
import featureFlags from '../../../utils/featureFlags';

// Initialize email transport
let emailTransporter: nodemailer.Transporter | null = null;
if (
  process.env.EMAIL_USER &&
  process.env.GMAIL_CLIENT_ID &&
  process.env.GMAIL_CLIENT_SECRET &&
  process.env.GMAIL_REFRESH_TOKEN
) {
  emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.EMAIL_USER,
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN
    }
  });
}

// Initialize Slack client
const slackClient = process.env.SLACK_TOKEN
  ? new WebClient(process.env.SLACK_TOKEN)
  : null;

// Initialize Twilio client
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// Send notification endpoint
export const POST = withErrorHandling(async (request: Request) => {
  // Check authentication
  if (!isAuthenticated()) {
    return Errors.unauthorized('Authentication required to send notifications');
  }
  
  // Check if notification system feature is enabled
  if (!featureFlags.notificationSystem) {
    return Errors.forbidden('Notification system feature is disabled');
  }
  
  // Check feature flags
  if (!featureFlags.trigger.cron.enabled) {
    return Errors.forbidden('CRON trigger feature is disabled');
  }
  
  if (!featureFlags.trigger.rss.enabled) {
    return Errors.forbidden('RSS trigger feature is disabled');
  }
  
  if (!featureFlags.scraping.enabled) {
    return Errors.forbidden('Scraping feature is disabled');
  }
  
  if (!featureFlags.storage.notion.enabled) {
    return Errors.forbidden('Notion storage feature is disabled');
  }
  
  if (!featureFlags.writing.openai.enabled) {
    return Errors.forbidden('OpenAI writing feature is disabled');
  }
  
  if (!featureFlags.distribution.telegram.enabled) {
    return Errors.forbidden('Telegram distribution feature is disabled');
  }
  
  try {
    const body = await request.json();
    const { type, message, recipient } = body;
    
    // Validate input
    const typeError = validateEnum(type, ['email', 'slack', 'sms'], 'Notification type');
    if (typeError) {
      return Errors.badRequest(typeError);
    }
    
    const messageError = validateString(message, 'Message');
    if (messageError) {
      return Errors.badRequest(messageError);
    }
    
    const recipientError = validateString(recipient, 'Recipient');
    if (recipientError) {
      return Errors.badRequest(recipientError);
    }
    
    // Log the notification request
    await logToAuditTrail(createLogEntry('SEND_NOTIFICATION', { 
      type,
      recipientLength: recipient.length,
      messageLength: message.length
    }));
    
    // Send notification based on type
    if (type === 'email') {
      if (!emailTransporter) {
        return Errors.internalServerError('Email service not configured');
      }
      
      await emailTransporter.sendMail({
        from: process.env.EMAIL_USER,
        to: recipient,
        subject: 'Notification',
        text: message
      });
    } else if (type === 'slack') {
      if (!slackClient) {
        return Errors.internalServerError('Slack service not configured');
      }
      
      await slackClient.chat.postMessage({
        channel: recipient,
        text: message
      });
    } else if (type === 'sms') {
      if (!twilioClient) {
        return Errors.internalServerError('SMS service not configured');
      }
      
      await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: recipient
      });
    }
    
    // Log successful notification
    await logToAuditTrail(createLogEntry('SEND_NOTIFICATION_SUCCESS', { type }));
    
    // Return success response
    return NextResponse.json({ 
      message: 'Notification sent successfully',
      type
    });
  } catch (error) {
    console.error('Notification error:', error);
    
    // Log notification failure
    await logToAuditTrail(createLogEntry('SEND_NOTIFICATION_FAILURE', { 
      error: (error as Error).message
    }));
    
    return Errors.internalServerError('Error sending notification', {
      details: (error as Error).message
    });
  }
});

// Get notifications endpoint (placeholder for future implementation)
export const GET = withErrorHandling(async () => {
  // Check authentication
  if (!isAuthenticated()) {
    return Errors.unauthorized('Authentication required to retrieve notifications');
  }
  
  // Check if notification system feature is enabled
  if (!featureFlags.notificationSystem) {
    return Errors.forbidden('Notification system feature is disabled');
  }
  
  // Log the get notifications request
  await logToAuditTrail(createLogEntry('GET_NOTIFICATIONS'));
  
  // This is a placeholder for fetching notifications from a database
  // In a real implementation, you would query your database for notifications
  
  // Return empty array for now
  return NextResponse.json([]);
});
