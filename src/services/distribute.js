const logger = require('../utils/logger');
const { createError } = require('../utils/errorHandler');

// Import all service modules
const emailService = require('./email');
const slackService = require('./slack');
const notionService = require('./notion');
const sheetsService = require('./sheets');

class DistributeService {
  constructor() {
    this.services = {
      email: emailService,
      slack: slackService,
      notion: notionService,
      sheets: sheetsService
    };
  }

  /**
   * Distribute summary to configured channels
   * @param {string} summary - Generated summary text
   * @param {Object} originalForm - Original form data
   * @param {Object} distributionConfig - Distribution configuration
   * @returns {Promise<Object>} Distribution results
   */
  async distributeToChannels(summary, originalForm, distributionConfig) {
    const { channels = [], ...channelConfigs } = distributionConfig;
    
    if (!channels || channels.length === 0) {
      throw createError('No distribution channels specified', 400);
    }

    logger.info('Starting distribution to channels', {
      channels,
      summaryLength: summary.length
    });

    const results = {};
    const errors = {};

    // Process each channel
    for (const channel of channels) {
      try {
        const config = channelConfigs[channel];
        if (!config) {
          errors[channel] = 'Configuration missing for channel';
          continue;
        }

        let result;
        switch (channel) {
          case 'email':
            result = await this.distributeToEmail(summary, originalForm, config);
            break;
          case 'slack':
            result = await this.distributeToSlack(summary, originalForm, config);
            break;
          case 'notion':
            result = await this.distributeToNotion(summary, originalForm, config);
            break;
          case 'sheets':
            result = await this.distributeToSheets(summary, originalForm, config);
            break;
          default:
            errors[channel] = `Unknown channel: ${channel}`;
            continue;
        }

        results[channel] = result;
        logger.info(`Successfully distributed to ${channel}`, { channel, result });

      } catch (error) {
        errors[channel] = error.message;
        logger.error(`Failed to distribute to ${channel}:`, error);
      }
    }

    const summaryResult = {
      success: Object.keys(results).length > 0,
      results,
      errors,
      timestamp: new Date().toISOString(),
      summary: {
        total: channels.length,
        successful: Object.keys(results).length,
        failed: Object.keys(errors).length
      }
    };

    logger.info('Distribution completed', summaryResult.summary);
    return summaryResult;
  }

  /**
   * Distribute to email
   * @param {string} summary - Summary text
   * @param {Object} originalForm - Original form data
   * @param {Object} config - Email configuration
   * @returns {Promise<Object>} Result
   */
  async distributeToEmail(summary, originalForm, config) {
    return emailService.sendSummary(summary, originalForm, config);
  }

  /**
   * Distribute to Slack
   * @param {string} summary - Summary text
   * @param {Object} originalForm - Original form data
   * @param {Object} config - Slack configuration
   * @returns {Promise<Object>} Result
   */
  async distributeToSlack(summary, originalForm, config) {
    return slackService.sendSummary(summary, originalForm, config);
  }

  /**
   * Distribute to Notion
   * @param {string} summary - Summary text
   * @param {Object} originalForm - Original form data
   * @param {Object} config - Notion configuration
   * @returns {Promise<Object>} Result
   */
  async distributeToNotion(summary, originalForm, config) {
    return notionService.addSummary(summary, originalForm, config);
  }

  /**
   * Distribute to Google Sheets
   * @param {string} summary - Summary text
   * @param {Object} originalForm - Original form data
   * @param {Object} config - Sheets configuration
   * @returns {Promise<Object>} Result
   */
  async distributeToSheets(summary, originalForm, config) {
    return sheetsService.addSummary(summary, originalForm, config);
  }

  /**
   * Test all configured services
   * @returns {Promise<Object>} Test results
   */
  async testAllServices() {
    const results = {};

    for (const [serviceName, service] of Object.entries(this.services)) {
      try {
        if (service.testConnection) {
          results[serviceName] = await service.testConnection();
        } else {
          results[serviceName] = null; // Service doesn't support testing
        }
      } catch (error) {
        results[serviceName] = false;
        logger.error(`Service test failed for ${serviceName}:`, error);
      }
    }

    return results;
  }

  /**
   * Get service status and configuration
   * @returns {Object} Service status
   */
  getServiceStatus() {
    return {
      email: {
        configured: !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS),
        host: process.env.EMAIL_HOST || 'not configured'
      },
      slack: {
        configured: !!(process.env.SLACK_BOT_TOKEN || process.env.SLACK_WEBHOOK_URL),
        botToken: !!process.env.SLACK_BOT_TOKEN,
        webhook: !!process.env.SLACK_WEBHOOK_URL
      },
      notion: {
        configured: !!process.env.NOTION_API_TOKEN
      },
      sheets: {
        configured: !!(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || 
                      (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY))
      }
    };
  }
}

module.exports = new DistributeService();