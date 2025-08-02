# AI Form Summarizer

A full-stack application that uses AI to analyze and summarize form data, providing intelligent insights and automated processing capabilities.

## Features

- **React Frontend** with Material UI
- **JWT-based Authentication** (login/register)
- **Dashboard** for form summary management
- **Integration Settings** for external services
- **API Utilities** with Axios for backend communication
- **Responsive Design** with neutral UI theme

## Project Structure

```
ai-form-summarizer-backend/
├── frontend/                 # React frontend application
│   ├── public/              # Public assets
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── utils/           # Utilities and API clients
│   │   └── types/           # TypeScript type definitions
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your backend API URL:
   ```
   REACT_APP_API_URL=http://localhost:3001/api
   ```

5. Start the development server:
   ```bash
   npm start
   ```

The application will be available at `http://localhost:3000`.

## Frontend Features

### Authentication
- User registration and login
- JWT token management
- Protected routes
- Automatic token refresh

### Dashboard
- View all form summaries
- Create new form summaries
- Real-time status updates
- Responsive card layout

### Integration Settings
- Manage external service integrations
- Support for webhooks, APIs, and databases
- Test integration connections
- Enable/disable integrations

### UI/UX
- Material UI components
- Neutral, professional theme
- Responsive design
- Loading states and error handling

## API Integration

The frontend communicates with the backend through a RESTful API:

- **Authentication**: `/api/auth/login`, `/api/auth/register`
- **Forms**: `/api/forms/summaries`, `/api/forms/summarize`
- **Integrations**: `/api/integrations` (CRUD operations)

## Environment Variables

Create a `.env` file in the frontend directory with the following variables:

```env
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_ENV=development
```

## Available Scripts

In the frontend directory:

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm eject` - Eject from Create React App

## Technology Stack

### Frontend
- **React** 18 with TypeScript
- **Material UI** for components and theming
- **React Router** for navigation
- **Axios** for HTTP requests
- **Context API** for state management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test your changes
5. Submit a pull request

## License

This project is licensed under the MIT License.
