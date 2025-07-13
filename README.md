# Question Bank CLI

A Node.js CLI application to fetch and manage coding questions from Deepseek API via OpenRouter with duplicate detection and difficulty selection.

## Features

- 🎯 Interactive CLI with topic selection (JavaScript, TypeScript, Node.js, SQL, React)
- 🎚️ Difficulty selection (Easy, Medium, Hard, Mixed)
- 🤖 Fetches questions from Deepseek API via OpenRouter using free model
- 🔍 Hash-based duplicate detection to avoid storing duplicate questions
- 📁 Organized JSON file storage by topic
- 🔐 Secure API key management
- 💡 Each question includes 4 multiple choice solution approaches

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure API key:**
   Create a `.env` file in the root directory:
   ```bash
   # OpenRouter API Configuration
   API_KEY=your_openrouter_api_key_here
   
   # Optional: Custom site information
   SITE_URL=http://localhost:3000
   SITE_NAME=Question Bank CLI
   ```

3. **Get OpenRouter API Key:**
   - Visit [OpenRouter.ai](https://openrouter.ai)
   - Sign up for a free account
   - Get your API key from the dashboard
   - The app uses the free `deepseek/deepseek-chat-v3-0324:free` model

4. **Run the application:**
   ```bash
   npm start
   ```

## Usage

1. Run the CLI application
2. Select a programming topic from the menu
3. Choose difficulty level (Easy, Medium, Hard, or Mixed)
4. Select number of questions to fetch (3, 5, 10, or 15)
5. Questions are fetched from Deepseek API via OpenRouter
6. New questions are saved to `data/{topic}.json`
7. Duplicate questions are automatically detected and skipped
8. Each question includes 4 solution approaches for learning

## Question Format

Each question includes:
- **Question text** - The coding problem or challenge
- **Difficulty level** - Easy, Medium, or Hard
- **Tags** - Related concepts and technologies
- **Example** - Code example or expected output
- **4 Solution Options** - Different approaches to solve the problem
- **Correct Answer** - The recommended/best approach from the options
- **Metadata** - Timestamp, hash for duplicate detection

## Project Structure

```
question-bank-cli/
├── src/
│   ├── cli.js          # CLI interface with difficulty selection
│   ├── api.js          # OpenRouter/Deepseek API client
│   ├── storage.js      # File management with duplicate detection
│   └── utils.js        # Utilities (hash, validation)
├── data/               # Generated question files
│   ├── javascript.json
│   ├── typescript.json
│   ├── nodejs.json
│   ├── sql.json
│   ├── react.json
│   └── hashes.json     # Duplicate detection
├── .env                # API configuration (create this)
├── package.json
└── README.md
```

## API Requirements

- OpenRouter API key (free tier available)
- Access to `deepseek/deepseek-chat-v3-0324:free` model
- Internet connection for API requests

## Development

- Node.js >= 14.0.0
- Dependencies: inquirer@8.2.6, dotenv
- Uses native `fetch` API (Node.js 18+) or polyfill for older versions

## Test Mode

The application includes a test mode with realistic mock questions when no API key is provided. This allows you to test all functionality without an API key.

## Difficulty Levels

- **🟢 Easy**: Basic concepts, simple algorithms, fundamental programming problems
- **🟡 Medium**: Intermediate algorithms, data structures, moderate complexity
- **🔴 Hard**: Advanced algorithms, complex problems, optimization challenges
- **🌈 Mixed**: Combination of all difficulty levels for comprehensive practice 