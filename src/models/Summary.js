const mongoose = require('mongoose');

const summarySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  submission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission',
    required: true
  },
  summaryText: {
    type: String,
    required: true
  },
  keyPoints: [{
    type: String
  }],
  sentiment: {
    type: String,
    enum: ['positive', 'negative', 'neutral', 'mixed'],
    default: 'neutral'
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  aiModel: {
    type: String,
    default: 'gpt-3.5-turbo'
  },
  processingTime: {
    type: Number, // in milliseconds
    default: 0
  },
  tokenUsage: {
    prompt: Number,
    completion: Number,
    total: Number
  },
  metadata: {
    language: String,
    wordCount: Number,
    characterCount: Number,
    readingTime: Number // estimated reading time in minutes
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing'
  },
  error: String
}, {
  timestamps: true
});

// Index for efficient querying
summarySchema.index({ user: 1, createdAt: -1 });
summarySchema.index({ submission: 1 });
summarySchema.index({ status: 1 });
summarySchema.index({ sentiment: 1, user: 1 });

module.exports = mongoose.model('Summary', summarySchema);