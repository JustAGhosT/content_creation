const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { WebClient } = require('@slack/web-api');
const twilio = require('twilio');

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Slack configuration
const slackClient = new WebClient(process.env.SLACK_TOKEN);

// Twilio configuration
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Endpoint to send notifications
router.post('/send-notification', async (req, res) => {
  const { type, message, recipient } = req.body;

  try {
    if (type === 'email') {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: recipient,
        subject: 'Notification',
        text: message
      });
    } else if (type === 'slack') {
      await slackClient.chat.postMessage({
        channel: recipient,
        text: message
      });
    } else if (type === 'sms') {
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
    res.status(500).json({ message: 'Error sending notification', error: error.message });
  }
});

// Endpoint to get notifications
router.get('/notifications', async (req, res) => {
  // This is a placeholder for fetching notifications from a database or other storage
  res.status(200).json([]);
});

module.exports = router;
