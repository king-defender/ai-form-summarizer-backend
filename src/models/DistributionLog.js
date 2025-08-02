const mongoose = require('mongoose');

const distributionLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  summary: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Summary',
    required: true
  },
  distributionType: {
    type: String,
    required: true,
    enum: ['email', 'webhook', 'slack', 'teams', 'api']
  },
  recipients: [{
    type: String,
    required: true
  }],
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'partial'],
    default: 'pending'
  },
  successCount: {
    type: Number,
    default: 0
  },
  failureCount: {
    type: Number,
    default: 0
  },
  attempts: {
    type: Number,
    default: 0
  },
  lastAttempt: Date,
  nextRetry: Date,
  response: {
    success: [mongoose.Schema.Types.Mixed],
    errors: [mongoose.Schema.Types.Mixed]
  },
  metadata: {
    subject: String,
    template: String,
    priority: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal'
    },
    scheduledFor: Date,
    deliveryOptions: mongoose.Schema.Types.Mixed
  },
  deliveredAt: Date,
  error: String
}, {
  timestamps: true
});

// Index for efficient querying
distributionLogSchema.index({ user: 1, createdAt: -1 });
distributionLogSchema.index({ summary: 1 });
distributionLogSchema.index({ status: 1 });
distributionLogSchema.index({ distributionType: 1, user: 1 });
distributionLogSchema.index({ nextRetry: 1, status: 1 });

module.exports = mongoose.model('DistributionLog', distributionLogSchema);