# Question Bank CLI - Microservice Architecture

A Node.js CLI application built with microservice architecture to fetch and manage coding questions from Deepseek API via OpenRouter. All questions are stored in MongoDB Atlas for cloud-based persistence and scalability.

## 🏗️ Architecture Overview

This application follows a microservice architecture pattern with clear separation of concerns:

```
question-bank-cli/
├── config/                 # Configuration management
│   ├── app.js             # Application configuration
│   ├── api.js             # API configuration
│   └── database.js        # Database configuration
├── database/              # Database layer
│   ├── connections/       # Database connections
│   │   └── mongo.js      # MongoDB connection management
│   └── models/           # Database models
│       └── Question.js   # Question schema and methods
├── services/             # Microservices
│   ├── api/             # API service
│   │   └── api.js       # Deepseek API integration
│   ├── storage/         # Storage service
│   │   └── mongoStorage.js # MongoDB storage operations
│   └── cli/             # CLI service
│       └── cli.js       # Command-line interface
├── utils/               # Utility functions
│   └── utils.js         # Common utilities
├── middleware/          # Middleware components
│   ├── errorHandler.js  # Error handling middleware
│   └── logger.js        # Logging middleware
├── .env                 # Environment configuration
├── package.json
└── README.md
```

## 🚀 Features

- 🎯 **Interactive CLI** with topic selection (JavaScript, TypeScript, Node.js, SQL, React)
- 🤖 **AI Model Selection** (Deepseek or OpenAI GPT-3.5)
- 🎚️ **Difficulty selection** (Easy, Medium, Hard, Mixed)
- 🔍 **Hash-based duplicate detection** to avoid storing duplicate questions
- ☁️ **MongoDB Atlas cloud storage** for scalability and accessibility
- 💾 **Automatic backup system** - questions are saved to JSON files before database insertion
- 🔄 **Backup restoration** - restore questions from backup files if database fails
- 🔐 **Secure configuration management** with environment variables
- 💡 **Each question includes 4 multiple choice solution approaches**
- 🏗️ **Microservice architecture** for maintainability and scalability
- 📊 **Comprehensive logging and error handling**

## 🛠️ Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```bash
# OpenRouter API Configuration
API_KEY=your_openrouter_api_key_here

# MongoDB Atlas Configuration
MONGODB_URI=your_mongodb_atlas_connection_string

# Application Configuration
NODE_ENV=development
LOG_LEVEL=info

# Optional: Custom site information
SITE_URL=http://localhost:3000
SITE_NAME=Question Bank CLI
```

### 3. Get OpenRouter API Key
- Visit [OpenRouter.ai](https://openrouter.ai)
- Sign up for a free account
- Get your API key from the dashboard
- The app uses the free `deepseek/deepseek-chat-v3-0324:free` model

### 4. Setup MongoDB Atlas
- Create a MongoDB Atlas account at [mongodb.com](https://mongodb.com)
- Create a new cluster (free tier available)
- Get your connection string from the cluster
- Add the connection string to your `.env` file

### 5. Run the Application
```bash
npm start
```

## 📁 Project Structure

### Configuration Layer (`config/`)
- **app.js**: Application-wide configuration (topics, difficulties, etc.)
- **api.js**: API service configuration (endpoints, timeouts, retries)
- **database.js**: Database configuration (connection strings, indexes)

### Database Layer (`database/`)
- **connections/mongo.js**: MongoDB connection management with connection pooling
- **models/Question.js**: Mongoose schema with validation and static methods

### Service Layer (`services/`)
- **api/api.js**: Deepseek API integration with retry logic and error handling
- **storage/mongoStorage.js**: Database operations with duplicate detection
- **cli/cli.js**: Interactive command-line interface

### Utility Layer (`utils/`)
- **utils.js**: Common utility functions (hashing, validation, formatting)

### Middleware Layer (`middleware/`)
- **errorHandler.js**: Centralized error handling and logging
- **logger.js**: Structured logging with different log levels

## 🔧 Configuration

### Application Configuration (`config/app.js`)
```javascript
{
  environment: 'development',
  topics: ['javascript', 'typescript', 'nodejs', 'sql', 'react'],
  difficulties: ['easy', 'medium', 'hard', 'mixed'],
  questionCounts: [3, 5, 10, 15],
  logging: { level: 'info' }
}
```

### API Configuration (`config/api.js`)
```javascript
{
  deepseek: {
    baseURL: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'deepseek/deepseek-chat-v3-0324:free',
    timeout: 30000,
    retryAttempts: 3
  }
}
```

### Database Configuration (`config/database.js`)
```javascript
{
  mongodb: {
    uri: process.env.MONGODB_URI,
    options: { maxPoolSize: 10 }
  },
  indexes: [
    { topic: 1, difficulty: 1 },
    { question: 'text', example: 'text' }
  ]
}
```

## 🗄️ Database Schema

Questions are stored in MongoDB with the following schema:
- **id**: Unique identifier (String, indexed)
- **question**: Question text (String, indexed, trimmed)
- **difficulty**: Easy/Medium/Hard (String, indexed, enum)
- **topic**: Programming topic (String, indexed, enum)
- **tags**: Array of related concepts (Array, indexed, trimmed)
- **example**: Code example (String, trimmed)
- **options**: Array of solution approaches (Array, trimmed)
- **answer**: Correct answer (String, trimmed)
- **timestamp**: Creation timestamp (Date, indexed)
- **hash**: Unique hash for duplicate detection (String, unique, indexed)
- **savedAt**: Save timestamp (Date, indexed)
- **createdAt/updatedAt**: MongoDB timestamps (auto-generated)

## 🔄 Usage

1. Run the CLI application
2. Select a programming topic from the menu
3. Choose AI model (Deepseek or OpenAI GPT-3.5)
4. Choose difficulty level (Easy, Medium, Hard, or Mixed)
5. Select number of questions to fetch (3, 5, 10, or 15)
6. Questions are fetched from the selected AI model via OpenRouter
7. **Questions are automatically backed up to JSON files** before database insertion
8. New questions are saved to MongoDB Atlas
9. Duplicate questions are automatically detected and skipped
10. Each question includes 4 solution approaches for learning

## 💾 Backup System

The application includes a robust backup system to prevent data loss:

### Automatic Backup
- Questions are automatically saved to JSON files in the `backups/` directory
- Backup files are created before database insertion
- If database insertion fails, questions are safely preserved in backup files
- Backup files include metadata (topic, model, difficulty, timestamp)

### Backup File Format
```json
{
  "metadata": {
    "topic": "react",
    "model": "openai",
    "difficulty": "mixed",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "count": 5,
    "source": "AI API"
  },
  "questions": [...]
}
```

### Restore from Backup
```bash
node restoreFromBackup.js
```
This utility allows you to:
- View available backup files
- Select specific files to restore
- Restore questions to the database
- Clean up old backup files

### Backup Management
- Backup files are stored in `backups/` directory
- Files are automatically cleaned up after 7 days
- Backup directory is excluded from git



## 📊 Difficulty Levels

- **🟢 Easy**: Basic concepts, simple algorithms, fundamental programming problems
- **🟡 Medium**: Intermediate algorithms, data structures, moderate complexity
- **🔴 Hard**: Advanced algorithms, complex problems, optimization challenges
- **🌈 Mixed**: Combination of all difficulty levels for comprehensive practice

## 🔍 API Requirements

- OpenRouter API key (free tier available)
- Access to `deepseek/deepseek-chat-v3-0324:free` model
- MongoDB Atlas connection string
- Internet connection for API requests

## 🛠️ Development

### Prerequisites
- Node.js >= 14.0.0
- MongoDB Atlas account
- OpenRouter API key

### Dependencies
- **inquirer**: Interactive CLI prompts
- **dotenv**: Environment variable management
- **mongoose**: MongoDB ODM
- **mongodb**: MongoDB driver

### Scripts
```bash
npm start          # Start the CLI application
npm run dev        # Development mode
npm test           # Run tests (not implemented yet)
npm run lint       # Lint code (not implemented yet)
```

## 🏗️ Microservice Benefits

### 1. **Separation of Concerns**
- Each service has a single responsibility
- Clear boundaries between different layers
- Easy to understand and maintain

### 2. **Scalability**
- Services can be scaled independently
- Database operations are optimized
- API calls have retry logic and error handling

### 3. **Maintainability**
- Configuration is centralized
- Error handling is standardized
- Logging is structured and consistent

### 4. **Testability**
- Each service can be tested independently
- Mock data is available for testing
- Clear interfaces between services

### 5. **Flexibility**
- Easy to add new services
- Configuration can be changed without code changes
- Different deployment strategies possible

## 🔧 Error Handling

The application includes comprehensive error handling:

- **API Errors**: Retry logic with exponential backoff
- **Database Errors**: Connection pooling and graceful degradation
- **Validation Errors**: Input sanitization and validation
- **Network Errors**: Timeout handling and fallback mechanisms

## 📝 Logging

Structured logging with different levels:
- **ERROR**: Critical errors that need immediate attention
- **WARN**: Warning messages for potential issues
- **INFO**: General information about application flow
- **DEBUG**: Detailed debugging information

## 🚀 Future Enhancements

- [ ] Add unit tests for each service
- [ ] Implement API rate limiting
- [ ] Add question search functionality
- [ ] Create web dashboard
- [ ] Add user authentication
- [ ] Implement question categories
- [ ] Add performance monitoring
- [ ] Create deployment scripts 