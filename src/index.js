// Load environment variables if dotenv is available
try {
  require('dotenv').config();
} catch (err) {
  // dotenv not available, using environment variables directly
  console.log('Environment variables loaded directly (dotenv not available)');
}
const express = require('express');
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

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

module.exports = app;