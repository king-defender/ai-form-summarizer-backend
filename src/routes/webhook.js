const express = require('express');
const { body, validationResult } = require('express-validator');
const Submission = require('../models/Submission');
const Summary = require('../models/Summary');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Handle form submission webhook
// @route   POST /webhook
// @access  Private (requires JWT authentication)
router.post('/', protect, [
  body('formData').exists().withMessage('Form data is required'),
  body('formType').notEmpty().withMessage('Form type is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { formData, formType } = req.body;

    // Create submission record
    const submission = await Submission.create({
      user: req.user._id,
      formData,
      formType,
      source: 'webhook',
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        referrer: req.get('Referrer'),
        timestamp: new Date()
      },
      webhookData: {
        headers: req.headers,
        body: req.body,
        query: req.query
      },
      status: 'pending'
    });

    // TODO: Here you would typically:
    // 1. Queue the submission for AI processing
    // 2. Call your AI service to generate summary
    // 3. Update the submission status
    
    // For now, we'll create a mock summary
    try {
      submission.status = 'processing';
      await submission.save();

      // Mock AI processing - replace with actual AI service call
      const mockSummary = await createMockSummary(submission);

      submission.status = 'completed';
      await submission.save();

      res.status(201).json({
        success: true,
        message: 'Form submission received and processed successfully',
        data: {
          submissionId: submission._id,
          summaryId: mockSummary._id,
          status: submission.status
        }
      });
    } catch (processingError) {
      submission.status = 'failed';
      submission.processingError = processingError.message;
      await submission.save();

      res.status(500).json({
        success: false,
        message: 'Error processing form submission',
        error: processingError.message
      });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get user's submissions
// @route   GET /webhook/submissions
// @access  Private
router.get('/submissions', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const submissions = await Submission.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip(startIndex)
      .populate('user', 'firstName lastName email');

    const total = await Submission.countDocuments({ user: req.user._id });

    res.status(200).json({
      success: true,
      count: submissions.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      data: submissions
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get specific submission
// @route   GET /webhook/submissions/:id
// @access  Private
router.get('/submissions/:id', protect, async (req, res) => {
  try {
    const submission = await Submission.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('user', 'firstName lastName email');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    res.status(200).json({
      success: true,
      data: submission
    });
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Mock function to create summary - replace with actual AI service
async function createMockSummary(submission) {
  const formDataString = JSON.stringify(submission.formData);
  
  // Mock summary generation
  const summaryText = `Summary of ${submission.formType} form: ${formDataString.substring(0, 200)}...`;
  const keyPoints = [
    'Form submitted successfully',
    `Form type: ${submission.formType}`,
    'Data processed and validated'
  ];

  const summary = await Summary.create({
    user: submission.user,
    submission: submission._id,
    summaryText,
    keyPoints,
    sentiment: 'neutral',
    confidence: 0.85,
    aiModel: 'mock-ai-model',
    processingTime: Math.random() * 1000 + 500,
    tokenUsage: {
      prompt: 150,
      completion: 75,
      total: 225
    },
    metadata: {
      language: 'en',
      wordCount: summaryText.split(' ').length,
      characterCount: summaryText.length,
      readingTime: Math.ceil(summaryText.split(' ').length / 200)
    },
    status: 'completed'
  });

  return summary;
}

module.exports = router;