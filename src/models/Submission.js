const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  formData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  formType: {
    type: String,
    required: true,
    trim: true
  },
  source: {
    type: String,
    default: 'webhook',
    enum: ['webhook', 'manual', 'api']
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    referrer: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  processingError: String,
  webhookData: {
    headers: mongoose.Schema.Types.Mixed,
    body: mongoose.Schema.Types.Mixed,
    query: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index for efficient querying
submissionSchema.index({ user: 1, createdAt: -1 });
submissionSchema.index({ status: 1 });
submissionSchema.index({ formType: 1, user: 1 });

module.exports = mongoose.model('Submission', submissionSchema);