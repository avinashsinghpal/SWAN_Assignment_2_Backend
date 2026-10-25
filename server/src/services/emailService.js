const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../config/logger');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS
      }
    });
    return transporter;
  } catch (err) {
    logger.warn('Failed to initialize SMTP transporter', { error: err.message });
    return null;
  }
}

async function sendEmail({ to, subject, text, html }) {
  const mailer = getTransporter();
  if (!mailer) {
    logger.info('SMTP not configured; simulated email dispatch', {
      to,
      subject
    });
    return { success: true, simulated: true };
  }

  try {
    const info = await mailer.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      text,
      html
    });
    logger.info('Email sent successfully', { messageId: info.messageId, to });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    logger.error('Failed to send email', { error: err.message, to });
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendEmail
};
