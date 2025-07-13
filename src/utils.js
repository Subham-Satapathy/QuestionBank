const crypto = require('crypto');

function generateHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}

function validateQuestion(question) {
    const required = ['question', 'topic'];
    const missing = required.filter(field => !question[field]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    
    return true;
}

function formatTopicName(topic) {
    const topicMap = {
        'javascript': 'JavaScript',
        'typescript': 'TypeScript',
        'nodejs': 'Node.js',
        'sql': 'SQL',
        'react': 'React'
    };
    
    return topicMap[topic] || topic;
}

function sanitizeFilename(filename) {
    return filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

module.exports = {
    generateHash,
    validateQuestion,
    formatTopicName,
    sanitizeFilename
}; 