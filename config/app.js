require('dotenv').config();

const appConfig = {
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    topics: ['javascript', 'typescript', 'nodejs', 'sql', 'react'],
    difficulties: ['easy', 'medium', 'hard', 'mixed'],
    questionCounts: [3, 5, 10, 15],
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: 'combined'
    },
    security: {
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100 // limit each IP to 100 requests per windowMs
        }
    }
};

module.exports = appConfig; 