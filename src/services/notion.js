const { Client } = require('@notionhq/client');
const logger = require('../utils/logger');
const { createError } = require('../utils/errorHandler');

class NotionService {
  constructor() {
    this.client = null;
    this.initializeClient();
  }

  /**
   * Initialize Notion client with API token
   */
  initializeClient() {
    if (process.env.NOTION_API_TOKEN) {
      this.client = new Client({
        auth: process.env.NOTION_API_TOKEN
      });
      logger.info('Notion service initialized');
    } else {
      logger.warn('Notion service not configured. Missing NOTION_API_TOKEN');
    }
  }

  /**
   * Add form summary to Notion page or database
   * @param {string} summary - Generated summary text
   * @param {Object} originalForm - Original form data
   * @param {Object} notionConfig - Notion configuration
   * @returns {Promise<Object>} Notion operation result
   */
  async addSummary(summary, originalForm, notionConfig) {
    if (!this.client) {
      throw createError('Notion service not configured', 500);
    }

    const {
      pageId,
      databaseId,
      title = 'Form Submission Summary',
      includeOriginalData = false
    } = notionConfig;

    if (!pageId && !databaseId) {
      throw createError('Either Notion pageId or databaseId is required', 400);
    }

    try {
      let result;

      if (databaseId) {
        result = await this.addToDatabase(databaseId, summary, originalForm, title, includeOriginalData);
      } else {
        result = await this.addToPage(pageId, summary, originalForm, title, includeOriginalData);
      }

      logger.info('Notion entry created successfully', {
        type: databaseId ? 'database' : 'page',
        id: databaseId || pageId
      });

      return result;
    } catch (error) {
      logger.error('Failed to add to Notion:', error);
      throw createError(`Notion operation failed: ${error.message}`, 500);
    }
  }

  /**
   * Add entry to Notion database
   * @param {string} databaseId - Database ID
   * @param {string} summary - Summary text
   * @param {Object} originalForm - Original form data
   * @param {string} title - Entry title
   * @param {boolean} includeOriginalData - Whether to include original data
   * @returns {Promise<Object>} Result
   */
  async addToDatabase(databaseId, summary, originalForm, title, includeOriginalData) {
    // Build properties for the database entry
    const properties = {
      'Title': {
        title: [
          {
            text: {
              content: title
            }
          }
        ]
      },
      'Summary': {
        rich_text: [
          {
            text: {
              content: summary
            }
          }
        ]
      },
      'Created': {
        date: {
          start: new Date().toISOString()
        }
      }
    };

    // Add original form data as individual properties if requested
    if (includeOriginalData) {
      Object.entries(originalForm).forEach(([key, value]) => {
        // Sanitize property name for Notion
        const propertyName = key.replace(/[^a-zA-Z0-9\s]/g, '').trim();
        if (propertyName && typeof value === 'string') {
          properties[`Form_${propertyName}`] = {
            rich_text: [
              {
                text: {
                  content: value.substring(0, 2000) // Notion has character limits
                }
              }
            ]
          };
        }
      });
    }

    const response = await this.client.pages.create({
      parent: {
        database_id: databaseId
      },
      properties
    });

    return {
      success: true,
      type: 'database',
      pageId: response.id,
      url: response.url
    };
  }

  /**
   * Add content to existing Notion page
   * @param {string} pageId - Page ID
   * @param {string} summary - Summary text
   * @param {Object} originalForm - Original form data
   * @param {string} title - Section title
   * @param {boolean} includeOriginalData - Whether to include original data
   * @returns {Promise<Object>} Result
   */
  async addToPage(pageId, summary, originalForm, title, includeOriginalData) {
    const blocks = [
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: title
              }
            }
          ]
        }
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: `Generated on: ${new Date().toISOString()}`
              }
            }
          ]
        }
      },
      {
        object: 'block',
        type: 'callout',
        callout: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: summary
              }
            }
          ],
          icon: {
            emoji: '🤖'
          }
        }
      }
    ];

    if (includeOriginalData) {
      // Add original form data as a toggle block
      const formDataBlocks = Object.entries(originalForm).map(([key, value]) => ({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: `${key}: `,
                annotations: {
                  bold: true
                }
              }
            },
            {
              type: 'text',
              text: {
                content: String(value).substring(0, 1000) // Limit length
              }
            }
          ]
        }
      }));

      blocks.push({
        object: 'block',
        type: 'toggle',
        toggle: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: 'Original Form Data'
              }
            }
          ],
          children: formDataBlocks
        }
      });
    }

    const response = await this.client.blocks.children.append({
      block_id: pageId,
      children: blocks
    });

    return {
      success: true,
      type: 'page',
      pageId: pageId,
      blocksAdded: response.results.length
    };
  }

  /**
   * Test Notion connection
   * @returns {Promise<boolean>} Test result
   */
  async testConnection() {
    if (!this.client) {
      return false;
    }

    try {
      await this.client.users.me();
      return true;
    } catch (error) {
      logger.error('Notion connection test failed:', error);
      return false;
    }
  }

  /**
   * List available databases
   * @returns {Promise<Array>} List of databases
   */
  async listDatabases() {
    if (!this.client) {
      throw createError('Notion not configured', 500);
    }

    try {
      const response = await this.client.search({
        filter: {
          value: 'database',
          property: 'object'
        }
      });

      return response.results.map(db => ({
        id: db.id,
        title: db.title?.[0]?.plain_text || 'Untitled',
        url: db.url
      }));
    } catch (error) {
      logger.error('Failed to list Notion databases:', error);
      throw createError(`Failed to list databases: ${error.message}`, 500);
    }
  }
}

module.exports = new NotionService();