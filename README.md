# AI Form Summarizer Backend

A Dockerized Node.js backend service for AI-powered form summarization and multi-channel distribution. This service accepts form submissions via webhooks, generates intelligent summaries using AI, and distributes them across multiple platforms.

## Features

- **AI-Powered Summarization**: Uses Hugging Face or OpenRouter APIs for intelligent form response summarization
- **Multi-Channel Distribution**: Automatically distribute summaries to Gmail, Slack, Notion, and Google Sheets
- **Webhook Integration**: Simple REST API endpoint for receiving form submissions
- **Modular Architecture**: Clean, extensible codebase with service-based architecture
- **Docker Ready**: Fully containerized for easy deployment
- **Environment Configuration**: Flexible configuration via environment variables
- **Comprehensive Logging**: Built-in logging and error handling

## Architecture

```
src/
├── routes/
│   ├── webhook.js      # Webhook endpoint for form submissions
│   └── distribute.js   # Manual distribution endpoints
├── services/
│   ├── summarizer.js   # AI summarization service
│   ├── email.js        # Gmail/SMTP integration
│   ├── slack.js        # Slack integration
│   ├── notion.js       # Notion integration
│   ├── sheets.js       # Google Sheets integration
│   └── distribute.js   # Distribution coordinator
├── utils/
│   ├── logger.js       # Winston logging utility
│   └── errorHandler.js # Error handling utilities
└── index.js           # Express server entry point
```

## Quick Start with Docker

### 1. Clone and Setup

```bash
git clone <repository-url>
cd ai-form-summarizer-backend
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys and configurations
```

### 3. Build and Run with Docker

```bash
# Build the Docker image
docker build -t ai-form-summarizer .

# Run the container
docker run -p 3000:3000 --env-file .env ai-form-summarizer
```

### 4. Test the Service

```bash
# Health check
curl http://localhost:3000/health

# Test form submission
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "formResponse": {
      "name": "John Doe",
      "email": "john@example.com",
      "message": "This is a test form submission"
    },
    "config": {
      "distribution": {
        "channels": ["email"],
        "email": {
          "to": "recipient@example.com",
          "subject": "New Form Submission"
        }
      }
    }
  }'
```

## Local Development

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

## Configuration

### Required Environment Variables

At minimum, configure one AI provider:

```env
# AI Provider (required)
HUGGING_FACE_API_KEY=your_key_here
# OR
OPENROUTER_API_KEY=your_key_here
```

### Optional Service Configurations

Configure services you want to use for distribution:

#### Email (Gmail/SMTP)
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

#### Slack
```env
# Option 1: Bot Token
SLACK_BOT_TOKEN=xoxb-your-bot-token

# Option 2: Webhook URL
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

#### Notion
```env
NOTION_API_TOKEN=secret_your_integration_token
```

#### Google Sheets
```env
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

## API Endpoints

### POST /api/webhook

Main endpoint for form submissions.

**Request Body:**
```json
{
  "formResponse": {
    "field1": "value1",
    "field2": "value2"
  },
  "config": {
    "selectedFields": ["field1"],
    "customPrompt": "Summarize this form focusing on...",
    "summaryConfig": {
      "maxLength": 150,
      "model": "facebook/bart-large-cnn"
    },
    "distribution": {
      "channels": ["email", "slack"],
      "email": {
        "to": "user@example.com",
        "subject": "Form Summary"
      },
      "slack": {
        "channel": "#general"
      }
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "summary": "AI-generated summary text...",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "metadata": {
    "formFieldsProcessed": 2,
    "summaryLength": 156
  },
  "distribution": {
    "status": "triggered",
    "channels": ["email", "slack"]
  }
}
```

### POST /api/distribute

Manual distribution endpoint for pre-generated summaries.

### GET /api/distribute/status

Check status of all distribution services.

### GET /api/distribute/test

Test connections to all configured services.

## Distribution Channels

### Email
- Supports Gmail and generic SMTP
- HTML formatted emails with optional original form data
- Configurable recipients and subjects

### Slack
- Bot token or webhook URL support
- Rich message formatting with blocks
- Channel or direct message delivery

### Notion
- Add to existing pages or databases
- Automatic property creation for databases
- Collapsible sections for original form data

### Google Sheets
- Append or insert rows
- Automatic timestamp and summary columns
- Support for multiple sheets

## AI Providers

### Hugging Face
- Free tier available
- Multiple model options
- Good for basic summarization

**Supported Models:**
- `facebook/bart-large-cnn` (default)
- `google/pegasus-xsum`
- `sshleifer/distilbart-cnn-12-6`

### OpenRouter
- Access to latest LLM models
- Pay-per-use pricing
- Higher quality summaries

**Supported Models:**
- `microsoft/wizardlm-2-8x22b` (default)
- `anthropic/claude-3-haiku`
- `openai/gpt-3.5-turbo`

## Docker Deployment

### Production Build

```bash
# Build production image
docker build -t ai-form-summarizer:latest .

# Run with production environment
docker run -d \
  --name form-summarizer \
  -p 3000:3000 \
  --env-file .env.production \
  --restart unless-stopped \
  ai-form-summarizer:latest
```

### Docker Compose

```yaml
version: '3.8'
services:
  ai-form-summarizer:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Health Monitoring

The service includes built-in health monitoring:

- **Health Check**: `GET /health`
- **Service Status**: `GET /api/distribute/status`
- **Connection Tests**: `GET /api/distribute/test`
- **Logs**: Winston logging to console and files

## Error Handling

- Comprehensive error logging
- Graceful service degradation
- Detailed error responses
- Health check endpoints

## Security

- Non-root Docker user
- Environment variable configuration
- Input validation
- Rate limiting ready (add middleware as needed)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the logs for error details
2. Verify environment configuration
3. Test individual services using `/api/distribute/test`
4. Open an issue with detailed information