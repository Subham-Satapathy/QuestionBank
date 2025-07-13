require('dotenv').config();

const databaseConfig = {
    mongodb: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/question-bank',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
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