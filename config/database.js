require('dotenv').config();

const databaseConfig = {
    mongodb: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/question-bank',
        options: {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 10000,
            retryWrites: true,
            w: 'majority'
        }
    },
    collections: {
        questions: 'questions'
    },
    indexes: {
        questions: [
            { topic: 1, difficulty: 1 },
            { topic: 1, tags: 1 },
            { difficulty: 1, tags: 1 },
            { question: 'text', example: 'text' }
        ]
    }
};

module.exports = databaseConfig; 