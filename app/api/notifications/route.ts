import { NextResponse } from 'next/server';
import { withErrorHandling, Errors } from '../_utils/errors';
import { isAuthenticated } from '../_utils/auth';
import { createLogEntry, logToAuditTrail } from '../_utils/audit';
import { validateString, validateEnum, validateObject } from '../_utils/validation';
import nodemailer from 'nodemailer';
import { WebClient } from '@slack/web-api';
import twilio from 'twilio';

// Import feature flags
import featureFlags from '../../../utils/featureFlags';

// Define validation schema using the existing validation functions
const notificationValidators = {
  type: (value: unknown) => validateEnum(value, ['email', 'slack', 'sms'] as const, 'Notification type'),
  message: (value: unknown) => validateString(value, 'Message'),
  recipient: (value: unknown) => validateString(value, 'Recipient')
};

// Initialize clients (hidden from error messages)
const initializeClients = () => {
  // Initialize email transport
  const emailTransporter = process.env.EMAIL_USER && 
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

  // Initialize Slack client
  const slackClient = process.env.SLACK_TOKEN
    ? new WebClient(process.env.SLACK_TOKEN)
    : null;

  // Initialize Twilio client
  const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

  return { emailTransporter, slackClient, twilioClient };
};

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
  
  try {
    const body = await request.json();
    
    // Validate input using validateObject with our schema
    const validationErrors = validateObject(body, notificationValidators);
    if (validationErrors) {
      return Errors.badRequest('Validation failed', validationErrors);
    }
    
    const { type, message, recipient } = body as { type: string; message: string; recipient: string };
    
    // Log the notification request
    const logEntry = await createLogEntry('SEND_NOTIFICATION', { 
      type,
      recipientLength: recipient.length,
      messageLength: message.length
    });
    await logToAuditTrail(logEntry);
    
    // Initialize clients
    const { emailTransporter, slackClient, twilioClient } = initializeClients();
    
    // Send notification based on type
    try {
      if (type === 'email') {
        if (!emailTransporter) {
          // Log detailed error but return generic message
          console.error('Email service not configured');
          throw new Error('Notification service configuration error');
        }
        
        await emailTransporter.sendMail({
          from: process.env.EMAIL_USER,
          to: recipient,
          subject: 'Notification',
          text: message
        });
      } else if (type === 'slack') {
        if (!slackClient) {
          console.error('Slack service not configured');
          throw new Error('Notification service configuration error');
        }
        
        await slackClient.chat.postMessage({
          channel: recipient,
          text: message
        });
      } else if (type === 'sms') {
        if (!twilioClient || !process.env.TWILIO_PHONE_NUMBER) {
          console.error('SMS service not configured');
          throw new Error('Notification service configuration error');
        }
        
        await twilioClient.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: recipient
        });
      }
    } catch (serviceError) {
      // Log the detailed error
      console.error(`Notification service error (${type}):`, serviceError);
      
      // Log notification failure with internal details
      const failureLogEntry = await createLogEntry('SEND_NOTIFICATION_FAILURE', { 
        type,
        error: (serviceError as Error).message,
        stack: (serviceError as Error).stack
      });
      await logToAuditTrail(failureLogEntry);
      
      // Return generic error to client
      return Errors.internalServerError('Failed to send notification');
    }
    
    // Log successful notification
    const successLogEntry = await createLogEntry('SEND_NOTIFICATION_SUCCESS', { type });
    await logToAuditTrail(successLogEntry);
    
    // Return success response
    return NextResponse.json({ 
      message: 'Notification sent successfully',
      type
    });
  } catch (error) {
    console.error('Notification error:', error);
    
    // Log notification failure
    const errorLogEntry = await createLogEntry('SEND_NOTIFICATION_FAILURE', { 
      error: (error as Error).message
    });
    await logToAuditTrail(errorLogEntry);
    
    // Return generic error message
    return Errors.internalServerError('Failed to process notification request');
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
  const logEntry = await createLogEntry('GET_NOTIFICATIONS');
  await logToAuditTrail(logEntry);
  
  // This is a placeholder for fetching notifications from a database
  // In a real implementation, you would query your database for notifications
  
  // Return empty array for now
  return NextResponse.json([]);
});