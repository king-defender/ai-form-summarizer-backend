const { google } = require('googleapis');
const logger = require('../utils/logger');
const { createError } = require('../utils/errorHandler');

class SheetsService {
  constructor() {
    this.sheets = null;
    this.auth = null;
    this.initializeClient();
  }

  /**
   * Initialize Google Sheets client
   */
  initializeClient() {
    try {
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        // Using service account key
        const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        this.auth = new google.auth.GoogleAuth({
          credentials: serviceAccount,
          scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
      } else if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
        // Using individual credentials
        this.auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            type: 'service_account'
          },
          scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
      } else {
        logger.warn('Google Sheets service not configured. Missing GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_CLIENT_EMAIL/GOOGLE_PRIVATE_KEY');
        return;
      }

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      logger.info('Google Sheets service initialized');
    } catch (error) {
      logger.error('Failed to initialize Google Sheets service:', error);
    }
  }

  /**
   * Add form summary to Google Sheets
   * @param {string} summary - Generated summary text
   * @param {Object} originalForm - Original form data
   * @param {Object} sheetsConfig - Sheets configuration
   * @returns {Promise<Object>} Sheets operation result
   */
  async addSummary(summary, originalForm, sheetsConfig) {
    if (!this.sheets) {
      throw createError('Google Sheets service not configured', 500);
    }

    const {
      spreadsheetId,
      range = 'Sheet1!A:Z',
      includeOriginalData = false,
      mode = 'append' // 'append' or 'insert'
    } = sheetsConfig;

    if (!spreadsheetId) {
      throw createError('Google Sheets spreadsheetId is required', 400);
    }

    try {
      let result;

      if (mode === 'insert') {
        result = await this.insertRow(spreadsheetId, range, summary, originalForm, includeOriginalData);
      } else {
        result = await this.appendRow(spreadsheetId, range, summary, originalForm, includeOriginalData);
      }

      logger.info('Google Sheets entry added successfully', {
        spreadsheetId,
        range,
        mode
      });

      return result;
    } catch (error) {
      logger.error('Failed to add to Google Sheets:', error);
      throw createError(`Google Sheets operation failed: ${error.message}`, 500);
    }
  }

  /**
   * Append row to Google Sheets
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {string} range - Range notation
   * @param {string} summary - Summary text
   * @param {Object} originalForm - Original form data
   * @param {boolean} includeOriginalData - Include original data
   * @returns {Promise<Object>} Result
   */
  async appendRow(spreadsheetId, range, summary, originalForm, includeOriginalData) {
    // Prepare row data
    const rowData = [
      new Date().toISOString(), // Timestamp
      summary // Summary
    ];

    if (includeOriginalData) {
      // Add original form data as separate columns
      Object.entries(originalForm).forEach(([key, value]) => {
        rowData.push(`${key}: ${value}`);
      });
    }

    const response = await this.sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: {
        values: [rowData]
      }
    });

    return {
      success: true,
      mode: 'append',
      spreadsheetId,
      updatedRange: response.data.updates.updatedRange,
      updatedRows: response.data.updates.updatedRows
    };
  }

  /**
   * Insert row at specific position in Google Sheets
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {string} range - Range notation
   * @param {string} summary - Summary text
   * @param {Object} originalForm - Original form data
   * @param {boolean} includeOriginalData - Include original data
   * @returns {Promise<Object>} Result
   */
  async insertRow(spreadsheetId, range, summary, originalForm, includeOriginalData) {
    // Get sheet name from range
    const sheetName = range.split('!')[0];
    
    // First, get sheet properties to find the sheet ID
    const spreadsheet = await this.sheets.spreadsheets.get({
      spreadsheetId
    });

    const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
    if (!sheet) {
      throw createError(`Sheet '${sheetName}' not found`, 400);
    }

    const sheetId = sheet.properties.sheetId;

    // Insert a new row at the top (after header if exists)
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: 1, // Insert after first row (assuming header)
                endIndex: 2
              },
              inheritFromBefore: false
            }
          }
        ]
      }
    });

    // Prepare row data
    const rowData = [
      new Date().toISOString(), // Timestamp
      summary // Summary
    ];

    if (includeOriginalData) {
      Object.entries(originalForm).forEach(([key, value]) => {
        rowData.push(`${key}: ${value}`);
      });
    }

    // Add data to the newly inserted row
    const insertRange = `${sheetName}!A2:Z2`; // Second row (after header)
    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: insertRange,
      valueInputOption: 'RAW',
      resource: {
        values: [rowData]
      }
    });

    return {
      success: true,
      mode: 'insert',
      spreadsheetId,
      insertedAt: insertRange
    };
  }

  /**
   * Create headers in the spreadsheet
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {string} range - Range notation
   * @param {boolean} includeFormFields - Include form field headers
   * @param {Array} formFields - Form field names
   * @returns {Promise<Object>} Result
   */
  async createHeaders(spreadsheetId, range, includeFormFields = false, formFields = []) {
    if (!this.sheets) {
      throw createError('Google Sheets service not configured', 500);
    }

    const headers = ['Timestamp', 'Summary'];
    
    if (includeFormFields && formFields.length > 0) {
      headers.push(...formFields.map(field => `Form: ${field}`));
    }

    try {
      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: range.split('!')[0] + '!A1:Z1', // First row
        valueInputOption: 'RAW',
        resource: {
          values: [headers]
        }
      });

      return {
        success: true,
        spreadsheetId,
        headersCreated: headers.length,
        updatedRange: response.data.updatedRange
      };
    } catch (error) {
      logger.error('Failed to create headers:', error);
      throw createError(`Failed to create headers: ${error.message}`, 500);
    }
  }

  /**
   * Test Google Sheets connection
   * @returns {Promise<boolean>} Test result
   */
  async testConnection() {
    if (!this.sheets) {
      return false;
    }

    try {
      // Try to access the auth client
      const authClient = await this.auth.getClient();
      return !!authClient;
    } catch (error) {
      logger.error('Google Sheets connection test failed:', error);
      return false;
    }
  }

  /**
   * Get spreadsheet information
   * @param {string} spreadsheetId - Spreadsheet ID
   * @returns {Promise<Object>} Spreadsheet info
   */
  async getSpreadsheetInfo(spreadsheetId) {
    if (!this.sheets) {
      throw createError('Google Sheets service not configured', 500);
    }

    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId
      });

      return {
        title: response.data.properties.title,
        sheets: response.data.sheets.map(sheet => ({
          title: sheet.properties.title,
          sheetId: sheet.properties.sheetId,
          rowCount: sheet.properties.gridProperties.rowCount,
          columnCount: sheet.properties.gridProperties.columnCount
        }))
      };
    } catch (error) {
      logger.error('Failed to get spreadsheet info:', error);
      throw createError(`Failed to get spreadsheet info: ${error.message}`, 500);
    }
  }
}

module.exports = new SheetsService();