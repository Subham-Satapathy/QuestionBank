require('dotenv').config();
const apiConfig = require('../../config/api');
const { generateHash } = require('../../utils/utils');

class DeepseekAPI {
    constructor() {
        this.apiKey = apiConfig.deepseek.apiKey;
        this.baseURL = apiConfig.deepseek.baseURL;
        this.model = apiConfig.deepseek.model;
        this.headers = apiConfig.deepseek.headers;
        this.timeout = apiConfig.timeout;
        this.retryAttempts = apiConfig.retryAttempts;
        this.retryDelay = apiConfig.retryDelay;
        
        if (!this.apiKey) {
            throw new Error('API_KEY environment variable is required');
        }
    }

    async fetchQuestions(topic, count = 5, difficulty = 'mixed') {
        try {
            const prompt = this.generatePrompt(topic, count, difficulty);
            
            const response = await this.makeAPIRequest(prompt);
            const content = response.choices[0].message.content;
            const parsedQuestions = this.parseQuestions(content, topic);
            
            // If no questions were parsed successfully, return empty array
            if (parsedQuestions.length === 0) {
                console.warn('⚠️  No questions could be parsed from API response');
                return [];
            }
            
            // Return only the questions that were successfully parsed
            return parsedQuestions;
            
        } catch (error) {
            console.error('❌ API request failed:', error.message);
            throw new Error(`Failed to fetch questions from API: ${error.message}`);
        }
    }

    async makeAPIRequest(prompt) {
        let lastError;
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const response = await fetch(this.baseURL, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${this.apiKey}`,
                        ...this.headers
                    },
                    body: JSON.stringify({
                        "model": this.model,
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are a coding interview expert. Generate coding questions in valid JSON format only."
                            },
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ]
                    }),
                    signal: AbortSignal.timeout(this.timeout)
                });

                if (!response.ok) {
                    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
                }

                return await response.json();
                
            } catch (error) {
                lastError = error;
                console.warn(`⚠️  API attempt ${attempt} failed:`, error.message);
                
                if (attempt < this.retryAttempts) {
                    console.log(`🔄 Retrying in ${this.retryDelay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                }
            }
        }
        
        throw lastError;
    }

    async saveQuestionsToMongoDB(topic, questions) {
        try {
            const { MongoStorage } = require('../storage/mongoStorage');
            const storage = new MongoStorage();
            const result = await storage.saveQuestions(topic, questions);
            await storage.disconnect();
            return result;
        } catch (error) {
            console.error('❌ Error saving questions to MongoDB:', error);
            throw error;
        }
    }

    async getQuestionsFromMongoDB(topic, options = {}) {
        try {
            const { MongoStorage } = require('../storage/mongoStorage');
            const storage = new MongoStorage();
            const questions = await storage.loadQuestions(topic);
            await storage.disconnect();
            return questions;
        } catch (error) {
            console.error('❌ Error loading questions from MongoDB:', error);
            return [];
        }
    }

    async searchQuestionsInMongoDB(searchText, options = {}) {
        try {
            const { MongoStorage } = require('../storage/mongoStorage');
            const storage = new MongoStorage();
            const questions = await storage.searchQuestions(searchText, options);
            await storage.disconnect();
            return questions;
        } catch (error) {
            console.error('❌ Error searching questions in MongoDB:', error);
            return [];
        }
    }

    async getStatsFromMongoDB() {
        try {
            const { MongoStorage } = require('../storage/mongoStorage');
            const storage = new MongoStorage();
            const stats = await storage.getStats();
            await storage.disconnect();
            return stats;
        } catch (error) {
            console.error('❌ Error getting stats from MongoDB:', error);
            return {};
        }
    }



    generatePrompt(topic, count, difficulty = 'mixed') {
        const difficultyText = difficulty === 'mixed' 
            ? 'a mix of easy, medium, and hard difficulties' 
            : `${difficulty} difficulty`;
            
        return `Generate ${count} coding interview questions for ${topic} with ${difficultyText}. 
        Each question should include 4 multiple choice options for approaches/solutions and specify the correct answer.
        Return ONLY a valid JSON array with this exact structure:
        [
            {
                "id": "unique_id",
                "question": "question text",
                "difficulty": "easy|medium|hard",
                "topic": "${topic}",
                "tags": ["tag1", "tag2"],
                "example": "code example if applicable",
                "options": [
                    "Option A: approach description",
                    "Option B: approach description", 
                    "Option C: approach description",
                    "Option D: approach description"
                ],
                "answer": "The correct option from the options array"
            }
        ]
        
        Make sure the JSON is valid and contains no additional text or formatting.`;
    }

    parseQuestions(content, topic) {
        try {
            // First, try to find and extract JSON array
            let jsonMatch = content.match(/\[[\s\S]*\]/);
            
            if (!jsonMatch) {
                // Try to find JSON object array pattern
                jsonMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
            }
            
            if (!jsonMatch) {
                console.warn('⚠️  No valid JSON array found in response, returning empty array');
                return [];
            }
            
            let jsonString = jsonMatch[0];
            
            // Clean up common JSON formatting issues
            jsonString = jsonString
                .replace(/,\s*}/g, '}')  // Remove trailing commas before }
                .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
                .replace(/([{,]\s*)(\w+):/g, '$1"$2":')  // Quote unquoted keys
                .replace(/:\s*'([^']*)'/g, ': "$1"')  // Replace single quotes with double quotes
                .replace(/\n/g, ' ')  // Remove newlines
                .replace(/\r/g, ' ')  // Remove carriage returns
                .replace(/\t/g, ' ')  // Replace tabs with spaces
                .replace(/\s+/g, ' ')  // Normalize whitespace
                .trim();
            
            // Try to parse the cleaned JSON
            let questions;
            try {
                questions = JSON.parse(jsonString);
            } catch (parseError) {
                // If parsing still fails, try to fix more issues
                console.log('First parse failed, attempting to extract individual questions...');
                
                // Try to fix incomplete JSON by finding the last complete object
                const objects = [];
                let depth = 0;
                let currentObj = '';
                let inString = false;
                let escapeNext = false;
                
                for (let i = 1; i < jsonString.length - 1; i++) { // Skip outer brackets
                    const char = jsonString[i];
                    
                    if (escapeNext) {
                        escapeNext = false;
                        currentObj += char;
                        continue;
                    }
                    
                    if (char === '\\') {
                        escapeNext = true;
                        currentObj += char;
                        continue;
                    }
                    
                    if (char === '"' && !escapeNext) {
                        inString = !inString;
                    }
                    
                    if (!inString) {
                        if (char === '{') {
                            if (depth === 0) {
                                currentObj = '{';
                            } else {
                                currentObj += char;
                            }
                            depth++;
                        } else if (char === '}') {
                            depth--;
                            currentObj += char;
                            
                            if (depth === 0) {
                                try {
                                    const obj = JSON.parse(currentObj);
                                    objects.push(obj);
                                    currentObj = '';
                                } catch (e) {
                                    // Skip malformed object silently
                                    console.warn(`⚠️  Skipping malformed question object: ${e.message}`);
                                    currentObj = '';
                                }
                            }
                        } else if (depth > 0) {
                            currentObj += char;
                        }
                    } else {
                        currentObj += char;
                    }
                }
                
                if (objects.length === 0) {
                    console.warn('⚠️  Could not extract any valid question objects from response, returning empty array');
                    return [];
                }
                
                questions = objects;
            }
            
            if (!Array.isArray(questions)) {
                questions = [questions];
            }
            
            // Generate a unique base timestamp for this batch to avoid ID conflicts
            const baseTimestamp = Date.now();
            const randomSuffix = Math.random().toString(36).substring(2, 8);
            
            // Validate and enhance questions, filtering out invalid ones
            const validQuestions = questions
                .filter(q => {
                    if (!q || typeof q !== 'object' || !q.question) {
                        console.warn('⚠️  Skipping invalid question object:', q);
                        return false;
                    }
                    return true;
                })
                .map((q, index) => ({
                    id: q.id || `${topic}_${baseTimestamp}_${randomSuffix}_${index}`,
                    question: q.question || 'No question text provided',
                    difficulty: q.difficulty || 'medium',
                    topic: topic,
                    tags: Array.isArray(q.tags) ? q.tags : ['general'],
                    example: q.example || '',
                    options: Array.isArray(q.options) ? q.options : [],
                    answer: q.answer || '',
                    timestamp: new Date().toISOString()
                }));
            
            if (validQuestions.length === 0) {
                console.warn('⚠️  No valid questions found in response, returning empty array');
                return [];
            }
            
            console.log(`✅ Successfully parsed ${validQuestions.length} questions`);
            return validQuestions;
            
        } catch (error) {
            console.warn('⚠️  JSON parsing failed completely:', error.message);
            console.log('Raw content preview:', content.substring(0, 500) + '...');
            // Return empty array instead of throwing error
            return [];
        }
    }
}

async function fetchQuestions(topic, count = 5, difficulty = 'mixed') {
    const api = new DeepseekAPI();
    return await api.fetchQuestions(topic, count, difficulty);
}

module.exports = {
    DeepseekAPI,
    fetchQuestions
}; 