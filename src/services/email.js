const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const { createError } = require('../utils/errorHandler');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter with configuration from environment variables
   */
  initializeTransporter() {
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      logger.warn('Email service not configured. Missing EMAIL_HOST, EMAIL_USER, or EMAIL_PASS');
      return;
    }

    this.transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    logger.info('Email service initialized');
  }

  /**
   * Send email with form summary
   * @param {string} summary - Generated summary text
   * @param {Object} originalForm - Original form data
   * @param {Object} emailConfig - Email configuration
   * @returns {Promise<Object>} Email send result
   */
  async sendSummary(summary, originalForm, emailConfig) {
    if (!this.transporter) {
      throw createError('Email service not configured', 500);
    }

    const {
      to,
      subject = 'Form Submission Summary',
      includeOriginalData = false,
      from = process.env.EMAIL_FROM || process.env.EMAIL_USER
    } = emailConfig;

    if (!to) {
      throw createError('Email recipient (to) is required', 400);
    }

    // Build email content
    let htmlContent = `
      <h2>Form Submission Summary</h2>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
        <h3>AI-Generated Summary:</h3>
        <p>${summary}</p>
      </div>
    `;

    if (includeOriginalData) {
      htmlContent += `
        <div style="margin-top: 20px;">
          <h3>Original Form Data:</h3>
          <table style="border-collapse: collapse; width: 100%;">
            <thead>
              <tr style="background-color: #e0e0e0;">
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Field</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Value</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(originalForm).map(([key, value]) => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px;">${key}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${value}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    htmlContent += `
      <div style="margin-top: 20px; font-size: 12px; color: #666;">
        <p>Generated on: ${new Date().toISOString()}</p>
      </div>
    `;

    const mailOptions = {
      from,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html: htmlContent,
      text: `Form Submission Summary\n\nAI-Generated Summary:\n${summary}\n\nGenerated on: ${new Date().toISOString()}`
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info('Email sent successfully', {
        to: mailOptions.to,
        subject: mailOptions.subject,
        messageId: result.messageId
      });

      return {
        success: true,
        messageId: result.messageId,
        recipient: mailOptions.to
      };
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw createError(`Email sending failed: ${error.message}`, 500);
    }
  }

  /**
   * Test email configuration
   * @returns {Promise<boolean>} Test result
   */
  async testConnection() {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      logger.error('Email connection test failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();