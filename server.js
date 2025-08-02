const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Import routes
const authRoutes = require('./src/routes/auth');
const webhookRoutes = require('./src/routes/webhook');
const distributeRoutes = require('./src/routes/distribute');

// Import middleware
const errorHandler = require('./src/middleware/error');

// Import database connection
const connectDB = require('./src/config/database');

// Connect to database
connectDB();

const app = express();

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});

app.use(limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy for rate limiting and IP detection
app.set('trust proxy', 1);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AI Form Summarizer Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API info endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AI Form Summarizer Backend API',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /auth/register',
        login: 'POST /auth/login',
        forgotPassword: 'POST /auth/forgot-password',
        resetPassword: 'PUT /auth/reset-password/:resettoken'
      },
      webhook: {
        submit: 'POST /webhook (requires auth)',
        getSubmissions: 'GET /webhook/submissions (requires auth)',
        getSubmission: 'GET /webhook/submissions/:id (requires auth)'
      },
      distribute: {
        distribute: 'POST /distribute (requires auth)',
        getLogs: 'GET /distribute/logs (requires auth)',
        getLog: 'GET /distribute/logs/:id (requires auth)'
      },
      health: 'GET /health'
    },
    documentation: 'See README.md for detailed API documentation'
  });
});

// Mount routers
app.use('/auth', authRoutes);
app.use('/webhook', webhookRoutes);
app.use('/distribute', distributeRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log(`Error: ${err.message}`);
  console.log('Shutting down the server due to Uncaught Exception');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = app;