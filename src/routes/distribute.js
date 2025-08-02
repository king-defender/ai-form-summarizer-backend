const express = require('express');
const { body, validationResult } = require('express-validator');
const Summary = require('../models/Summary');
const DistributionLog = require('../models/DistributionLog');
const sendEmail = require('../utils/sendEmail');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Distribute summary via email, webhook, or other channels
// @route   POST /distribute
// @access  Private (requires JWT authentication)
router.post('/', protect, [
  body('summaryId').isMongoId().withMessage('Valid summary ID is required'),
  body('distributionType').isIn(['email', 'webhook', 'slack', 'teams', 'api']).withMessage('Valid distribution type is required'),
  body('recipients').isArray({ min: 1 }).withMessage('At least one recipient is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { summaryId, distributionType, recipients, metadata = {} } = req.body;

    // Verify the summary belongs to the authenticated user
    const summary = await Summary.findOne({
      _id: summaryId,
      user: req.user._id
    }).populate('submission');

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'Summary not found or not authorized'
      });
    }

    // Create distribution log
    const distributionLog = await DistributionLog.create({
      user: req.user._id,
      summary: summaryId,
      distributionType,
      recipients,
      status: 'pending',
      metadata: {
        subject: metadata.subject || `Form Summary - ${summary.submission.formType}`,
        template: metadata.template || 'default',
        priority: metadata.priority || 'normal',
        scheduledFor: metadata.scheduledFor || new Date(),
        deliveryOptions: metadata.deliveryOptions || {}
      }
    });

    try {
      let distributionResult;

      switch (distributionType) {
        case 'email':
          distributionResult = await distributeViaEmail(summary, recipients, metadata, req.user);
          break;
        case 'webhook':
          distributionResult = await distributeViaWebhook(summary, recipients, metadata);
          break;
        case 'slack':
          distributionResult = await distributeViaSlack(summary, recipients, metadata);
          break;
        case 'teams':
          distributionResult = await distributeViaTeams(summary, recipients, metadata);
          break;
        case 'api':
          distributionResult = await distributeViaAPI(summary, recipients, metadata);
          break;
        default:
          throw new Error('Unsupported distribution type');
      }

      // Update distribution log with results
      distributionLog.status = distributionResult.status;
      distributionLog.successCount = distributionResult.successCount;
      distributionLog.failureCount = distributionResult.failureCount;
      distributionLog.response = distributionResult.response;
      distributionLog.deliveredAt = distributionResult.status === 'sent' ? new Date() : undefined;
      distributionLog.attempts = 1;
      distributionLog.lastAttempt = new Date();

      await distributionLog.save();

      res.status(200).json({
        success: true,
        message: 'Distribution completed successfully',
        data: {
          distributionLogId: distributionLog._id,
          status: distributionLog.status,
          successCount: distributionLog.successCount,
          failureCount: distributionLog.failureCount
        }
      });
    } catch (distributionError) {
      // Update distribution log with error
      distributionLog.status = 'failed';
      distributionLog.error = distributionError.message;
      distributionLog.attempts = 1;
      distributionLog.lastAttempt = new Date();
      distributionLog.nextRetry = new Date(Date.now() + 5 * 60 * 1000); // Retry in 5 minutes

      await distributionLog.save();

      res.status(500).json({
        success: false,
        message: 'Distribution failed',
        error: distributionError.message,
        distributionLogId: distributionLog._id
      });
    }
  } catch (error) {
    console.error('Distribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get distribution logs for user
// @route   GET /distribute/logs
// @access  Private
router.get('/logs', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const logs = await DistributionLog.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip(startIndex)
      .populate('summary', 'summaryText keyPoints')
      .populate('user', 'firstName lastName email');

    const total = await DistributionLog.countDocuments({ user: req.user._id });

    res.status(200).json({
      success: true,
      count: logs.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      data: logs
    });
  } catch (error) {
    console.error('Get distribution logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get specific distribution log
// @route   GET /distribute/logs/:id
// @access  Private
router.get('/logs/:id', protect, async (req, res) => {
  try {
    const log = await DistributionLog.findOne({
      _id: req.params.id,
      user: req.user._id
    })
      .populate('summary', 'summaryText keyPoints sentiment')
      .populate('user', 'firstName lastName email');

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Distribution log not found'
      });
    }

    res.status(200).json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error('Get distribution log error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Distribution helper functions

async function distributeViaEmail(summary, recipients, metadata, user) {
  const successRecipients = [];
  const failedRecipients = [];

  for (const email of recipients) {
    try {
      const emailContent = generateEmailContent(summary, metadata, user);
      
      await sendEmail({
        email,
        subject: metadata.subject || `Form Summary - ${summary.submission.formType}`,
        message: emailContent.text,
        html: emailContent.html
      });

      successRecipients.push({ email, status: 'sent' });
    } catch (error) {
      failedRecipients.push({ email, error: error.message });
    }
  }

  return {
    status: failedRecipients.length === 0 ? 'sent' : (successRecipients.length === 0 ? 'failed' : 'partial'),
    successCount: successRecipients.length,
    failureCount: failedRecipients.length,
    response: {
      success: successRecipients,
      errors: failedRecipients
    }
  };
}

async function distributeViaWebhook(summary, recipients, metadata) {
  // Mock webhook distribution - implement actual webhook logic
  const successRecipients = [];
  const failedRecipients = [];

  for (const webhookUrl of recipients) {
    try {
      // Mock successful webhook call
      successRecipients.push({ url: webhookUrl, status: 'sent' });
    } catch (error) {
      failedRecipients.push({ url: webhookUrl, error: error.message });
    }
  }

  return {
    status: failedRecipients.length === 0 ? 'sent' : 'partial',
    successCount: successRecipients.length,
    failureCount: failedRecipients.length,
    response: {
      success: successRecipients,
      errors: failedRecipients
    }
  };
}

async function distributeViaSlack(summary, recipients, metadata) {
  // Mock Slack distribution - implement actual Slack API logic
  return {
    status: 'sent',
    successCount: recipients.length,
    failureCount: 0,
    response: {
      success: recipients.map(channel => ({ channel, status: 'sent' })),
      errors: []
    }
  };
}

async function distributeViaTeams(summary, recipients, metadata) {
  // Mock Teams distribution - implement actual Teams API logic
  return {
    status: 'sent',
    successCount: recipients.length,
    failureCount: 0,
    response: {
      success: recipients.map(channel => ({ channel, status: 'sent' })),
      errors: []
    }
  };
}

async function distributeViaAPI(summary, recipients, metadata) {
  // Mock API distribution - implement actual API logic
  return {
    status: 'sent',
    successCount: recipients.length,
    failureCount: 0,
    response: {
      success: recipients.map(endpoint => ({ endpoint, status: 'sent' })),
      errors: []
    }
  };
}

function generateEmailContent(summary, metadata, user) {
  const text = `
    Form Summary Report
    
    Hello,
    
    Please find below the summary of the form submission:
    
    Summary: ${summary.summaryText}
    
    Key Points:
    ${summary.keyPoints.map(point => `- ${point}`).join('\n')}
    
    Sentiment: ${summary.sentiment}
    Confidence: ${(summary.confidence * 100).toFixed(1)}%
    
    Generated by: ${user.firstName} ${user.lastName} (${user.email})
    Generated at: ${new Date().toLocaleString()}
    
    Best regards,
    AI Form Summarizer Team
  `;

  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
            Form Summary Report
          </h1>
          
          <p>Hello,</p>
          
          <p>Please find below the summary of the form submission:</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin-top: 0;">Summary:</h3>
            <p style="margin-bottom: 15px;">${summary.summaryText}</p>
            
            <h3 style="color: #2c3e50;">Key Points:</h3>
            <ul>
              ${summary.keyPoints.map(point => `<li>${point}</li>`).join('')}
            </ul>
            
            <div style="display: flex; gap: 20px; margin-top: 15px;">
              <div>
                <strong>Sentiment:</strong> 
                <span style="background-color: #e3f2fd; padding: 2px 8px; border-radius: 3px;">
                  ${summary.sentiment}
                </span>
              </div>
              <div>
                <strong>Confidence:</strong> ${(summary.confidence * 100).toFixed(1)}%
              </div>
            </div>
          </div>
          
          <div style="border-top: 1px solid #ddd; padding-top: 15px; font-size: 12px; color: #666;">
            <p>Generated by: ${user.firstName} ${user.lastName} (${user.email})</p>
            <p>Generated at: ${new Date().toLocaleString()}</p>
          </div>
          
          <p style="margin-top: 20px;">Best regards,<br>AI Form Summarizer Team</p>
        </div>
      </body>
    </html>
  `;

  return { text, html };
}

module.exports = router;