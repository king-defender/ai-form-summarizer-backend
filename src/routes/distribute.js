const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { createError, asyncHandler } = require('../utils/errorHandler');
const distributeService = require('../services/distribute');

/**
 * Manual distribution endpoint
 * This endpoint allows manual triggering of distribution without form processing
 * 
 * Expected payload:
 * {
 *   "summary": "Pre-generated summary text",
 *   "originalForm": { "field1": "value1" }, // optional
 *   "distribution": {
 *     "channels": ["email", "slack"],
 *     "email": { "to": "user@example.com" },
 *     "slack": { "channel": "#general" }
 *   }
 * }
 */
router.post('/distribute', asyncHandler(async (req, res) => {
  const { summary, originalForm = {}, distribution } = req.body;

  // Validate required fields
  if (!summary || typeof summary !== 'string') {
    throw createError('Missing or invalid summary text', 400);
  }

  if (!distribution || !distribution.channels || !Array.isArray(distribution.channels)) {
    throw createError('Missing or invalid distribution configuration', 400);
  }

  if (distribution.channels.length === 0) {
    throw createError('At least one distribution channel must be specified', 400);
  }

  logger.info('Manual distribution request received', {
    summaryLength: summary.length,
    channels: distribution.channels,
    hasOriginalForm: Object.keys(originalForm).length > 0
  });

  try {
    const result = await distributeService.distributeToChannels(summary, originalForm, distribution);

    logger.info('Manual distribution completed', {
      successful: result.summary.successful,
      failed: result.summary.failed
    });

    res.json({
      success: result.success,
      distribution: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Manual distribution error:', error);
    throw error;
  }
}));

/**
 * Test distribution services endpoint
 */
router.get('/distribute/test', asyncHandler(async (req, res) => {
  logger.info('Testing distribution services');

  const testResults = await distributeService.testAllServices();
  const serviceStatus = distributeService.getServiceStatus();

  res.json({
    serviceStatus,
    connectionTests: testResults,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get service status endpoint
 */
router.get('/distribute/status', (req, res) => {
  const serviceStatus = distributeService.getServiceStatus();
  
  res.json({
    services: serviceStatus,
    timestamp: new Date().toISOString()
  });
});

/**
 * Test individual service endpoint
 */
router.get('/distribute/test/:service', asyncHandler(async (req, res) => {
  const { service } = req.params;
  const validServices = ['email', 'slack', 'notion', 'sheets'];

  if (!validServices.includes(service)) {
    throw createError(`Invalid service. Must be one of: ${validServices.join(', ')}`, 400);
  }

  logger.info(`Testing ${service} service`);

  const distributeServiceInstance = require('../services/distribute');
  const serviceInstance = distributeServiceInstance.services[service];

  if (!serviceInstance || !serviceInstance.testConnection) {
    throw createError(`Service ${service} does not support connection testing`, 400);
  }

  try {
    const testResult = await serviceInstance.testConnection();
    
    res.json({
      service,
      connected: testResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Service test failed for ${service}:`, error);
    res.json({
      service,
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * Preview distribution configuration endpoint
 * This helps users validate their distribution config without actually sending
 */
router.post('/distribute/preview', asyncHandler(async (req, res) => {
  const { distribution } = req.body;

  if (!distribution) {
    throw createError('Distribution configuration is required', 400);
  }

  const { channels = [], ...channelConfigs } = distribution;
  const preview = {
    channels: [],
    errors: [],
    warnings: []
  };

  // Validate each channel configuration
  for (const channel of channels) {
    const config = channelConfigs[channel];
    const channelPreview = {
      channel,
      configured: false,
      config: config || null,
      requirements: {}
    };

    switch (channel) {
      case 'email':
        channelPreview.requirements = { to: 'required', subject: 'optional', from: 'optional' };
        channelPreview.configured = !!(config && config.to);
        if (!config?.to) preview.errors.push(`Email: 'to' field is required`);
        break;

      case 'slack':
        channelPreview.requirements = { channel: 'required OR webhook', webhook: 'required OR channel' };
        channelPreview.configured = !!(config && (config.channel || config.webhook));
        if (!config?.channel && !config?.webhook) {
          preview.errors.push(`Slack: Either 'channel' or 'webhook' is required`);
        }
        break;

      case 'notion':
        channelPreview.requirements = { pageId: 'required OR databaseId', databaseId: 'required OR pageId' };
        channelPreview.configured = !!(config && (config.pageId || config.databaseId));
        if (!config?.pageId && !config?.databaseId) {
          preview.errors.push(`Notion: Either 'pageId' or 'databaseId' is required`);
        }
        break;

      case 'sheets':
        channelPreview.requirements = { spreadsheetId: 'required', range: 'optional' };
        channelPreview.configured = !!(config && config.spreadsheetId);
        if (!config?.spreadsheetId) preview.errors.push(`Sheets: 'spreadsheetId' is required`);
        break;

      default:
        preview.errors.push(`Unknown channel: ${channel}`);
        continue;
    }

    preview.channels.push(channelPreview);
  }

  // Check service availability
  const serviceStatus = distributeService.getServiceStatus();
  for (const channel of channels) {
    if (serviceStatus[channel] && !serviceStatus[channel].configured) {
      preview.warnings.push(`${channel} service is not configured in environment variables`);
    }
  }

  res.json({
    preview,
    valid: preview.errors.length === 0,
    timestamp: new Date().toISOString()
  });
}));

module.exports = router;