const axios = require('axios');
const logger = require('../utils/logger');
const { createError } = require('../utils/errorHandler');

class SummarizerService {
  constructor() {
    this.huggingFaceApiKey = process.env.HUGGING_FACE_API_KEY;
    this.openRouterApiKey = process.env.OPENROUTER_API_KEY;
    this.preferredProvider = process.env.AI_PROVIDER || 'huggingface'; // 'huggingface' or 'openrouter'
  }

  /**
   * Summarize form response using AI
   * @param {Object} formData - Form response data
   * @param {Object} config - Configuration options
   * @returns {Promise<string>} Summary text
   */
  async summarizeForm(formData, config = {}) {
    try {
      // Extract selected fields or use all fields
      const fieldsToSummarize = this.extractFields(formData, config.selectedFields);
      
      // Build prompt
      const prompt = this.buildPrompt(fieldsToSummarize, config.customPrompt);
      
      // Choose AI provider
      let summary;
      if (this.preferredProvider === 'openrouter' && this.openRouterApiKey) {
        summary = await this.summarizeWithOpenRouter(prompt, config);
      } else if (this.huggingFaceApiKey) {
        summary = await this.summarizeWithHuggingFace(prompt, config);
      } else {
        throw createError('No AI provider configured. Please set HUGGING_FACE_API_KEY or OPENROUTER_API_KEY', 500);
      }

      logger.info('Form summarization completed', {
        fieldsCount: Object.keys(fieldsToSummarize).length,
        summaryLength: summary.length,
        provider: this.preferredProvider
      });

      return summary;
    } catch (error) {
      logger.error('Error in form summarization:', error);
      throw error;
    }
  }

  /**
   * Extract specific fields from form data
   * @param {Object} formData - Complete form data
   * @param {Array} selectedFields - Array of field names to include
   * @returns {Object} Filtered form data
   */
  extractFields(formData, selectedFields) {
    if (!formData || typeof formData !== 'object') {
      return {};
    }

    if (!selectedFields || !Array.isArray(selectedFields) || selectedFields.length === 0) {
      return formData;
    }

    const extracted = {};
    selectedFields.forEach(field => {
      if (formData.hasOwnProperty(field) && formData[field] != null) {
        extracted[field] = formData[field];
      }
    });

    return extracted;
  }

  /**
   * Build prompt for AI summarization
   * @param {Object} formData - Form data to summarize
   * @param {string} customPrompt - Optional custom prompt
   * @returns {string} Complete prompt
   */
  buildPrompt(formData, customPrompt) {
    const defaultPrompt = "Please provide a concise and clear summary of the following form submission:";
    const prompt = customPrompt || defaultPrompt;
    
    const formDataString = Object.entries(formData || {})
      .filter(([key, value]) => key !== null && key !== undefined && value !== null && value !== undefined)
      .map(([key, value]) => `${String(key)}: ${String(value)}`)
      .join('\n');

    return `${prompt}\n\n${formDataString}`;
  }

  /**
   * Summarize using Hugging Face API
   * @param {string} prompt - Text to summarize
   * @param {Object} config - Configuration options
   * @returns {Promise<string>} Summary
   */
  async summarizeWithHuggingFace(prompt, config) {
    const model = config.model || 'facebook/bart-large-cnn';
    const maxLength = config.maxLength || 150;
    const minLength = config.minLength || 30;

    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        inputs: prompt,
        parameters: {
          max_length: maxLength,
          min_length: minLength,
          do_sample: false
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${this.huggingFaceApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    if (response.data.error) {
      throw createError(`Hugging Face API error: ${response.data.error}`, 500);
    }

    return response.data[0]?.summary_text || response.data[0]?.generated_text || 'Summary not available';
  }

  /**
   * Summarize using OpenRouter API
   * @param {string} prompt - Text to summarize
   * @param {Object} config - Configuration options
   * @returns {Promise<string>} Summary
   */
  async summarizeWithOpenRouter(prompt, config) {
    const model = config.model || 'microsoft/wizardlm-2-8x22b';
    const maxTokens = config.maxTokens || 150;

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature: 0.1
      },
      {
        headers: {
          'Authorization': `Bearer ${this.openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.HTTP_REFERER || 'http://localhost:3000',
          'X-Title': 'AI Form Summarizer'
        },
        timeout: 30000
      }
    );

    if (response.data.error) {
      throw createError(`OpenRouter API error: ${response.data.error.message}`, 500);
    }

    return response.data.choices[0]?.message?.content || 'Summary not available';
  }
}

module.exports = new SummarizerService();