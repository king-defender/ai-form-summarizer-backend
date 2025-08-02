# AI Form Summarizer Backend

A robust Node.js backend service with multi-user support, MongoDB integration, and authentication features for processing and summarizing form submissions using AI.

## Quick Start

```bash
# Clone and setup
git clone <repository-url>
cd ai-form-summarizer-backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start MongoDB (using Docker)
docker run -d --name mongodb -p 27017:27017 mongo:latest

# Start the server
npm start

# Test the installation
./test.sh
```

## Features

- **Multi-user Authentication**: Secure user registration, login, and password reset
- **MongoDB Integration**: Persistent storage for users, submissions, summaries, and distribution logs
- **Form Processing**: Webhook endpoint for receiving and processing form submissions
- **AI Summary Generation**: Automated summarization of form data (mock implementation included)
- **Multi-channel Distribution**: Email, webhook, Slack, Teams, and API distribution options
- **Security**: JWT authentication, password hashing, rate limiting, and CORS protection
- **Docker Support**: Containerized deployment ready

## Prerequisites

- Node.js 18+ 
- MongoDB 4.4+
- npm or yarn
- Docker (optional, for containerized deployment)

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd ai-form-summarizer-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/ai-form-summarizer
MONGODB_TEST_URI=mongodb://localhost:27017/ai-form-summarizer-test

# JWT Configuration
JWT_SECRET=your-very-long-random-jwt-secret-key-here
JWT_EXPIRE=7d
JWT_RESET_EXPIRE=1h

# Email Configuration (for password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@ai-form-summarizer.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

### 4. Start MongoDB

Make sure MongoDB is running on your system:

```bash
# Using Docker
docker run -d --name mongodb -p 27017:27017 mongo:latest

# Or start your local MongoDB service
sudo systemctl start mongod  # Linux
brew services start mongodb-community  # macOS
```

### 5. Start the server

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

## Docker Deployment

### Build and run with Docker

```bash
# Build the Docker image
docker build -t ai-form-summarizer-backend .

# Run the container
docker run -d \
  --name ai-form-summarizer \
  -p 3000:3000 \
  --env-file .env \
  ai-form-summarizer-backend
```

### Using Docker Compose

Create a `docker-compose.yml` file:

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/ai-form-summarizer
    depends_on:
      - mongo
    env_file:
      - .env

  mongo:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

volumes:
  mongodb_data:
```

```bash
docker-compose up -d
```

## Testing

### Automated Testing

A comprehensive test script is provided to validate all functionality:

```bash
# Make sure the server is running first
npm start

# In another terminal, run the test script
./test.sh
```

The test script will:
- ✅ Check server health
- ✅ Test user registration and login
- ✅ Verify JWT authentication
- ✅ Test form submission processing
- ✅ Test distribution functionality
- ✅ Validate authorization protection
- ✅ Test error handling

### Manual Testing

You can also test individual endpoints manually:

### Base URL
```
http://localhost:3000
```

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login User
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

#### Forgot Password
```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Reset Password
```http
PUT /auth/reset-password/:resettoken
Content-Type: application/json

{
  "password": "newpassword"
}
```

### Protected Endpoints (Require JWT Token)

Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

#### Submit Form Data
```http
POST /webhook
Content-Type: application/json
Authorization: Bearer <token>

{
  "formData": {
    "name": "John Doe",
    "email": "john@example.com",
    "message": "This is a form submission"
  },
  "formType": "contact"
}
```

#### Get User's Submissions
```http
GET /webhook/submissions?page=1&limit=10
Authorization: Bearer <token>
```

#### Get Specific Submission
```http
GET /webhook/submissions/:id
Authorization: Bearer <token>
```

#### Distribute Summary
```http
POST /distribute
Content-Type: application/json
Authorization: Bearer <token>

{
  "summaryId": "64a7f8b2c1234567890abcde",
  "distributionType": "email",
  "recipients": ["recipient@example.com"],
  "metadata": {
    "subject": "Form Summary Report",
    "priority": "normal"
  }
}
```

#### Get Distribution Logs
```http
GET /distribute/logs?page=1&limit=10
Authorization: Bearer <token>
```

#### Get Specific Distribution Log
```http
GET /distribute/logs/:id
Authorization: Bearer <token>
```

### Health Check
```http
GET /health
```

## Database Models

### User
- `email`: Unique user email
- `password`: Hashed password
- `firstName`, `lastName`: User name
- `isEmailVerified`: Email verification status
- `passwordResetToken`, `passwordResetExpire`: Password reset fields
- `lastLogin`: Last login timestamp

### Submission
- `user`: Reference to User
- `formData`: Form submission data
- `formType`: Type of form submitted
- `source`: Submission source (webhook, manual, api)
- `status`: Processing status
- `metadata`: Additional metadata (IP, user agent, etc.)

### Summary
- `user`: Reference to User
- `submission`: Reference to Submission
- `summaryText`: Generated summary
- `keyPoints`: Array of key points
- `sentiment`: Sentiment analysis result
- `confidence`: AI confidence score
- `aiModel`: AI model used
- `tokenUsage`: Token usage statistics

### DistributionLog
- `user`: Reference to User
- `summary`: Reference to Summary
- `distributionType`: Distribution method
- `recipients`: Array of recipients
- `status`: Distribution status
- `successCount`, `failureCount`: Success/failure counts
- `response`: Distribution responses

## Security Features

- **JWT Authentication**: Stateless authentication using JSON Web Tokens
- **Password Hashing**: bcrypt with salt rounds for secure password storage
- **Rate Limiting**: Prevents abuse with configurable request limits
- **Input Validation**: Express-validator for request validation
- **CORS Protection**: Configurable CORS settings
- **Helmet.js**: Security headers and protection
- **Environment Variables**: Sensitive data stored in environment variables

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [] // Validation errors (if applicable)
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `429`: Too Many Requests
- `500`: Internal Server Error

## Development

### Project Structure
```
src/
├── config/          # Configuration files
├── middleware/      # Express middleware
├── models/          # Mongoose models
├── routes/          # API routes
└── utils/           # Utility functions
server.js            # Main server file
```

### Adding New Features

1. **Models**: Add new Mongoose schemas in `src/models/`
2. **Routes**: Create new route files in `src/routes/`
3. **Middleware**: Add custom middleware in `src/middleware/`
4. **Utilities**: Add helper functions in `src/utils/`

### Environment Variables

All configuration is managed through environment variables. See `.env.example` for all available options.

## Monitoring and Logging

- Console logging for development
- Health check endpoint at `/health`
- Error tracking and logging
- Process monitoring for graceful shutdown

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC License

## Support

For support and questions, please open an issue in the repository.
