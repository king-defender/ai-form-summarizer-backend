const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { createError, asyncHandler } = require('../utils/errorHandler');
const summarizerService = require('../services/summarizer');

/**
 * Webhook endpoint to receive form submissions
 * Expected payload structure:
 * {
 *   "formResponse": { "field1": "value1", "field2": "value2" },
 *   "config": {
 *     "selectedFields": ["field1", "field2"], // optional
 *     "customPrompt": "Custom summarization prompt", // optional
 *     "summaryConfig": { "maxLength": 150, "model": "..." }, // optional
 *     "distribution": {
 *       "channels": ["email", "slack", "notion", "sheets"],
 *       "email": { "to": "user@example.com", "subject": "Form Summary" },
 *       "slack": { "channel": "#general", "webhook": "..." },
 *       "notion": { "pageId": "...", "database": "..." },
 *       "sheets": { "spreadsheetId": "...", "range": "Sheet1!A:B" }
 *     }
 *   }
 * }
 */
router.post('/webhook', asyncHandler(async (req, res) => {
  const { formResponse, config } = req.body;

  // Validate required fields
  if (!formResponse || typeof formResponse !== 'object') {
    throw createError('Missing or invalid formResponse in request body', 400);
  }

  if (Object.keys(formResponse).length === 0) {
    throw createError('formResponse cannot be empty', 400);
  }

  logger.info('Webhook received form submission', {
    fieldsCount: Object.keys(formResponse).length,
    hasConfig: !!config,
    channels: config?.distribution?.channels || []
  });

  try {
    // Generate summary using AI service
    const summary = await summarizerService.summarizeForm(formResponse, config?.summaryConfig);

    // Prepare response
    const response = {
      success: true,
      summary,
      timestamp: new Date().toISOString(),
      metadata: {
        formFieldsProcessed: Object.keys(formResponse).length,
        summaryLength: summary.length
      }
    };

    // If distribution is configured, trigger distribution
    if (config?.distribution?.channels && config.distribution.channels.length > 0) {
      // Import distribution service here to avoid circular dependency
      const distributeService = require('../services/distribute');
      
      // Trigger distribution asynchronously (don't wait for completion)
      distributeService.distributeToChannels(summary, formResponse, config.distribution)
        .catch(error => {
          logger.error('Distribution failed:', error);
        });

      response.distribution = {
        status: 'triggered',
        channels: config.distribution.channels
      };
    }

    logger.info('Webhook processed successfully', {
      summaryLength: summary.length,
      distributionTriggered: !!config?.distribution?.channels
    });

    res.json(response);

  } catch (error) {
    logger.error('Webhook processing error:', error);
    throw error;
  }
}));

/**
 * Health check endpoint for webhook service
 */
router.get('/webhook/health', (req, res) => {
  res.json({
    service: 'webhook',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    aiProvider: process.env.AI_PROVIDER || 'huggingface',
    configuredProviders: {
      huggingface: !!process.env.HUGGING_FACE_API_KEY,
      openrouter: !!process.env.OPENROUTER_API_KEY
    }
  });
});

module.exports = router;