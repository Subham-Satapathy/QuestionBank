const crypto = require('crypto');

/**
 * Generate a hash for duplicate detection
 * @param {string} content - The content to hash
 * @returns {string} - The generated hash
 */
function generateHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Generate a hash for a question object
 * @param {Object} question - The question object
 * @returns {string} - The generated hash
 */
function generateQuestionHash(question) {
    // Create a more robust hash including question text and answer
    const content = `${question.question.toLowerCase().trim()}_${question.answer.toLowerCase().trim()}`;
    return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Format topic name for display
 * @param {string} topic - The topic to format
 * @returns {string} - The formatted topic name
 */
function formatTopicName(topic) {
    const topicMap = {
        'javascript': 'JavaScript',
        'typescript': 'TypeScript',
        'nodejs': 'Node.js',
        'sql': 'SQL',
        'react': 'React'
    };
    
    return topicMap[topic] || topic.charAt(0).toUpperCase() + topic.slice(1);
}

/**
 * Validate question data
 * @param {Object} question - The question object to validate
 * @returns {Object} - Validation result with isValid and errors
 */
function validateQuestion(question) {
    const errors = [];
    
    if (!question.question || question.question.trim() === '') {
        errors.push('Question text is required');
    }
    
    if (!question.difficulty || !['easy', 'medium', 'hard'].includes(question.difficulty)) {
        errors.push('Valid difficulty level is required');
    }
    
    if (!question.topic || question.topic.trim() === '') {
        errors.push('Topic is required');
    }
    
    if (!Array.isArray(question.options) || question.options.length === 0) {
        errors.push('At least one option is required');
    }
    
    if (!question.answer || question.answer.trim() === '') {
        errors.push('Answer is required');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Sanitize question data
 * @param {Object} question - The question object to sanitize
 * @returns {Object} - The sanitized question object
 */
function sanitizeQuestion(question) {
    return {
        ...question,
        question: question.question?.trim() || '',
        topic: question.topic?.trim() || '',
        example: question.example?.trim() || '',
        answer: question.answer?.trim() || '',
        tags: Array.isArray(question.tags) ? question.tags.map(tag => tag.trim()) : [],
        options: Array.isArray(question.options) ? question.options.map(option => option.trim()) : []
    };
}

/**
 * Generate a unique ID for questions
 * @param {string} topic - The topic
 * @param {string} difficulty - The difficulty
 * @param {number} index - The index
 * @returns {string} - The generated unique ID
 */
function generateUniqueId(topic, difficulty, index) {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${topic}_${difficulty}_${timestamp}_${randomSuffix}_${index}`;
}

/**
 * Format difficulty for display
 * @param {string} difficulty - The difficulty level
 * @returns {string} - The formatted difficulty
 */
function formatDifficulty(difficulty) {
    const difficultyMap = {
        'easy': '🟢 Easy',
        'medium': '🟡 Medium',
        'hard': '🔴 Hard',
        'mixed': '🌈 Mixed'
    };
    
    return difficultyMap[difficulty] || difficulty;
}

/**
 * Truncate text to a specified length
 * @param {string} text - The text to truncate
 * @param {number} maxLength - The maximum length
 * @returns {string} - The truncated text
 */
function truncateText(text, maxLength = 80) {
    if (!text || text.length <= maxLength) {
        return text;
    }
    
    return text.substring(0, maxLength) + '...';
}

/**
 * Calculate pagination info
 * @param {number} total - Total number of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} - Pagination information
 */
function calculatePagination(total, page, limit) {
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    return {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null
    };
}

module.exports = {
    generateHash,
    generateQuestionHash,
    formatTopicName,
    validateQuestion,
    sanitizeQuestion,
    generateUniqueId,
    formatDifficulty,
    truncateText,
    calculatePagination
}; 