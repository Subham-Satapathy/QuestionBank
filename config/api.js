require('dotenv').config();

const apiConfig = {
    deepseek: {
        baseURL: process.env.DEEPSEEK_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions',
        model: 'deepseek/deepseek-chat-v3-0324:free',
        apiKey: process.env.API_KEY,
        headers: {
            'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
            'X-Title': process.env.SITE_NAME || 'Question Bank CLI',
            'Content-Type': 'application/json'
        }
    },
    openai: {
        baseURL: process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions',
        model: 'openai/gpt-4o-mini',
        apiKey: process.env.API_KEY,
        headers: {
            'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
            'X-Title': process.env.SITE_NAME || 'Question Bank CLI',
            'Content-Type': 'application/json'
        }
    },
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
};

module.exports = apiConfig; 