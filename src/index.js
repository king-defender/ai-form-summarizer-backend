// Load environment variables if dotenv is available
try {
  require('dotenv').config();
} catch (err) {
  // dotenv not available, using environment variables directly
  console.log('Environment variables loaded directly (dotenv not available)');
}
const express = require('express');
const path = require('node:path');
const logger = require('./utils/logger');
const { errorHandler } = require('./utils/errorHandler');
const webhookRoutes = require('./routes/webhook');
const distributeRoutes = require('./routes/distribute');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Local demo form for exercising /api/webhook without a real Google Forms/Typeform
// integration - same origin as the API, so no CORS setup is needed for it.
app.use('/demo', express.static(path.join(__dirname, '..', 'demo')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', webhookRoutes);
app.use('/api', distributeRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use(errorHandler);

// Start server (skipped when required by tests via supertest, which drives the app
// in-process without an open port)
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

module.exports = app;