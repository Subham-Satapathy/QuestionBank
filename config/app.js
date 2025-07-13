require('dotenv').config();

const appConfig = {
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    topics: ['javascript', 'typescript', 'nodejs', 'sql', 'react'],
    difficulties: ['easy', 'medium', 'hard', 'mixed'],
    questionCounts: [3, 5, 10, 15],
    models: [
        { id: 'deepseek', name: 'Deepseek', description: 'Advanced reasoning and coding expertise' },
        { id: 'openai', name: 'OpenAI GPT-3.5', description: 'Balanced performance and reliability' }
    ],
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: 'combined'
    },
    security: {
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100 // limit each IP to 100 requests per windowMs
        }
    },
    // Recursive fetching configuration
    recursiveFetching: {
        batchSizes: [5, 10, 15, 20], // Available batch sizes for API calls
        defaultBatchSize: 10, // Default questions per API call
        delayBetweenBatches: 2000, // Delay between API calls in milliseconds
        maxConsecutiveFailures: 3, // Stop after this many consecutive failures
        progressUpdateInterval: 1000, // How often to update progress display
        maxTotalQuestions: 1000, // Safety limit for total questions to fetch
        retryDelay: 5000, // Delay before retrying after failure
        similarityThreshold: 0.85 // Duplicate detection threshold
    }
};

module.exports = appConfig; 