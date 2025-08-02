const { WebClient } = require('@slack/web-api');
const axios = require('axios');
const logger = require('../utils/logger');
const { createError } = require('../utils/errorHandler');

class SlackService {
  constructor() {
    this.client = null;
    this.initializeClient();
  }

  /**
   * Initialize Slack client with bot token
   */
  initializeClient() {
    if (process.env.SLACK_BOT_TOKEN) {
      this.client = new WebClient(process.env.SLACK_BOT_TOKEN);
      logger.info('Slack service initialized with bot token');
    } else {
      logger.warn('Slack service not configured. Missing SLACK_BOT_TOKEN');
    }
  }

  /**
   * Send form summary to Slack channel
   * @param {string} summary - Generated summary text
   * @param {Object} originalForm - Original form data
   * @param {Object} slackConfig - Slack configuration
   * @returns {Promise<Object>} Slack send result
   */
  async sendSummary(summary, originalForm, slackConfig) {
    const {
      channel,
      webhook,
      includeOriginalData = false,
      username = 'Form Summarizer Bot',
      iconEmoji = ':memo:'
    } = slackConfig;

    if (!channel && !webhook) {
      throw createError('Either Slack channel or webhook URL is required', 400);
    }

    // Build message blocks
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📋 Form Submission Summary'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*AI-Generated Summary:*\n${summary}`
        }
      }
    ];

    if (includeOriginalData) {
      const formFields = Object.entries(originalForm)
        .map(([key, value]) => `*${key}:* ${value}`)
        .join('\n');

      blocks.push(
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Original Form Data:*\n${formFields}`
          }
        }
      );
    }

    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Generated on: ${new Date().toISOString()}`
        }
      ]
    });

    try {
      let result;

      if (webhook) {
        // Use webhook URL
        result = await this.sendViaWebhook(webhook, blocks, username, iconEmoji);
      } else if (this.client && channel) {
        // Use bot token and channel
        result = await this.sendViaBot(channel, blocks);
      } else {
        throw createError('Slack not properly configured', 500);
      }

      logger.info('Slack message sent successfully', {
        channel: channel || 'webhook',
        method: webhook ? 'webhook' : 'bot'
      });

      return result;
    } catch (error) {
      logger.error('Failed to send Slack message:', error);
      throw createError(`Slack sending failed: ${error.message}`, 500);
    }
  }

  /**
   * Send message via Slack webhook
   * @param {string} webhookUrl - Slack webhook URL
   * @param {Array} blocks - Message blocks
   * @param {string} username - Bot username
   * @param {string} iconEmoji - Bot icon emoji
   * @returns {Promise<Object>} Result
   */
  async sendViaWebhook(webhookUrl, blocks, username, iconEmoji) {
    const payload = {
      username,
      icon_emoji: iconEmoji,
      blocks
    };

    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (response.status !== 200) {
      throw new Error(`Webhook request failed with status ${response.status}`);
    }

    return {
      success: true,
      method: 'webhook',
      status: response.status
    };
  }

  /**
   * Send message via Slack bot
   * @param {string} channel - Slack channel
   * @param {Array} blocks - Message blocks
   * @returns {Promise<Object>} Result
   */
  async sendViaBot(channel, blocks) {
    const response = await this.client.chat.postMessage({
      channel,
      blocks
    });

    return {
      success: true,
      method: 'bot',
      timestamp: response.ts,
      channel: response.channel
    };
  }

  /**
   * Test Slack configuration
   * @returns {Promise<boolean>} Test result
   */
  async testConnection() {
    if (!this.client) {
      return false;
    }

    try {
      await this.client.auth.test();
      return true;
    } catch (error) {
      logger.error('Slack connection test failed:', error);
      return false;
    }
  }

  /**
   * List available channels (requires bot token)
   * @returns {Promise<Array>} List of channels
   */
  async listChannels() {
    if (!this.client) {
      throw createError('Slack bot not configured', 500);
    }

    try {
      const response = await this.client.conversations.list({
        types: 'public_channel,private_channel'
      });

      return response.channels.map(channel => ({
        id: channel.id,
        name: channel.name,
        isPrivate: channel.is_private
      }));
    } catch (error) {
      logger.error('Failed to list Slack channels:', error);
      throw createError(`Failed to list channels: ${error.message}`, 500);
    }
  }
}

module.exports = new SlackService();