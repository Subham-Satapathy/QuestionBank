const Question = require('../../database/models/Question');
const mongoConnection = require('../../database/connections/mongo');
const { generateHash, generateQuestionHash } = require('../../utils/utils');

// Similarity calculation function
function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

class MongoStorage {
    constructor() {
        this.isConnected = false;
    }

    async ensureConnection() {
        if (!this.isConnected) {
            try {
                await mongoConnection.connect();
                this.isConnected = true;
            } catch (error) {
                console.error('❌ Failed to establish database connection:', error.message);
                throw new Error(`Database connection failed: ${error.message}`);
            }
        }
    }

    async loadHashes() {
        await this.ensureConnection();
        
        try {
            const questions = await Question.find({}, 'hash topic _id savedAt');
            const hashes = {};
            
            questions.forEach(q => {
                hashes[q.hash] = {
                    topic: q.topic,
                    _id: q._id,
                    savedAt: q.savedAt
                };
            });
            
            return hashes;
        } catch (error) {
            console.error('Error loading hashes:', error);
            return {};
        }
    }

    async saveHashes(hashes) {
        // In MongoDB, hashes are stored as part of the question documents
        // This method is kept for compatibility but doesn't need to do anything
        console.log('ℹ️  Hashes are automatically managed in MongoDB');
    }

    async loadQuestions(topic) {
        await this.ensureConnection();
        
        try {
            const questions = await Question.findByTopic(topic);
            return questions.map(q => q.toObject());
        } catch (error) {
            console.error(`Error loading questions for topic ${topic}:`, error);
            return [];
        }
    }

    async saveQuestions(topic, newQuestions) {
        await this.ensureConnection();
        
        try {
            // Filter out duplicates and prepare new questions
            const uniqueQuestions = [];
            let skippedCount = 0;
            
            for (const question of newQuestions) {
                const hash = generateQuestionHash(question);
                
                // Check if this exact question already exists
                const existingQuestion = await Question.findOne({ 
                    hash: hash,
                    topic: question.topic 
                });
                
                if (!existingQuestion) {
                    // Also check for similar questions using fuzzy matching
                    const similarQuestions = await Question.find({ topic: question.topic });
                    const isSimilar = similarQuestions.some(existing => {
                        const similarity = calculateSimilarity(question.question, existing.question);
                        return similarity > 0.85; // 85% similarity threshold
                    });
                    
                    if (!isSimilar) {
                        // Add hash and timestamp if not present
                        if (!question.hash) {
                            question.hash = hash;
                        }
                        if (!question.savedAt) {
                            question.savedAt = new Date().toISOString();
                        }
                        
                        uniqueQuestions.push(question);
                    } else {
                        console.log(`⚠️  Similar question detected and skipped: "${question.question.substring(0, 50)}..."`);
                        skippedCount++;
                    }
                } else {
                    console.log(`⚠️  Exact duplicate detected and skipped: "${question.question.substring(0, 50)}..."`);
                    skippedCount++;
                }
            }
            
            if (uniqueQuestions.length === 0) {
                console.log('ℹ️  No new questions to save (all were duplicates)');
                return { 
                    saved: 0, 
                    duplicates: newQuestions.length,
                    total: await Question.countDocuments({ topic })
                };
            }
            
            // Save questions to MongoDB one by one to handle potential ID conflicts gracefully
            const savedQuestions = [];
            let failedCount = 0;
            
            for (const question of uniqueQuestions) {
                try {
                    // Check for existing hash to avoid duplicates
                    const existingByHash = await Question.findOne({ hash: question.hash });
                    if (existingByHash) {
                        console.log(`⚠️  Skipping question with duplicate hash:`);
                        console.log(`   Question: "${question.question.substring(0, 100)}..."`);
                        console.log(`   Duplicate ID: ${existingByHash._id}`);
                        console.log(`   Duplicate Question: "${existingByHash.question.substring(0, 100)}..."`);
                        failedCount++;
                        continue;
                    }
                    
                    const savedQuestion = await Question.create(question);
                    savedQuestions.push(savedQuestion);
                } catch (error) {
                    if (error.code === 11000) {
                        console.log(`⚠️  Skipping question with duplicate key:`);
                        console.log(`   Question: "${question.question.substring(0, 100)}..."`);
                        console.log(`   Hash: ${question.hash}`);
                        
                        // Try to find the existing question that's causing the duplicate key error
                        try {
                            const existingQuestion = await Question.findOne({ hash: question.hash });
                            if (existingQuestion) {
                                console.log(`   Duplicate ID: ${existingQuestion._id}`);
                                console.log(`   Duplicate Question: "${existingQuestion.question.substring(0, 100)}..."`);
                            }
                        } catch (findError) {
                            console.log(`   Could not retrieve duplicate question details: ${findError.message}`);
                        }
                        
                        failedCount++;
                    } else {
                        console.error(`❌ Error saving question:`, error.message);
                        failedCount++;
                    }
                }
            }
            
            console.log(`✅ Saved ${savedQuestions.length} new questions to MongoDB for topic: ${topic}`);
            if (failedCount > 0) {
                console.log(`⚠️  Failed to save ${failedCount} questions due to conflicts`);
            }
            if (newQuestions.length > uniqueQuestions.length) {
                console.log(`⚠️  Skipped ${newQuestions.length - uniqueQuestions.length} duplicate questions`);
            }
            
            const totalCount = await Question.countDocuments({ topic });
            
            return {
                saved: savedQuestions.length,
                duplicates: newQuestions.length - uniqueQuestions.length + failedCount,
                total: totalCount
            };
            
        } catch (error) {
            console.error('Error saving questions:', error);
            throw error;
        }
    }

    async getStats() {
        await this.ensureConnection();
        
        try {
            const stats = await Question.getStats();
            const result = {};
            
            stats.forEach(stat => {
                result[stat.topic] = stat.total;
            });
            
            return result;
        } catch (error) {
            console.error('Error getting stats:', error);
            return {};
        }
    }

    async searchQuestions(searchText, options = {}) {
        await this.ensureConnection();
        
        try {
            let query = Question.searchQuestions(searchText);
            
            if (options.topic) {
                query = query.where('topic', options.topic);
            }
            
            if (options.difficulty) {
                query = query.where('difficulty', options.difficulty);
            }
            
            if (options.limit) {
                query = query.limit(options.limit);
            }
            
            return await query.exec();
        } catch (error) {
            console.error('Error searching questions:', error);
            return [];
        }
    }

    async getQuestionById(id) {
        await this.ensureConnection();
        
        try {
            return await Question.findById(id);
        } catch (error) {
            console.error('Error getting question by ID:', error);
            return null;
        }
    }

    async updateQuestion(id, updates) {
        await this.ensureConnection();
        
        try {
            return await Question.findByIdAndUpdate(
                id,
                updates,
                { new: true, runValidators: true }
            );
        } catch (error) {
            console.error('Error updating question:', error);
            throw error;
        }
    }

    async deleteQuestion(id) {
        await this.ensureConnection();
        
        try {
            return await Question.findByIdAndDelete(id);
        } catch (error) {
            console.error('Error deleting question:', error);
            throw error;
        }
    }

    async getQuestionsWithPagination(topic, page = 1, limit = 10) {
        await this.ensureConnection();
        
        try {
            const questions = await Question.getQuestionsWithPagination(topic, page, limit);
            const total = await Question.getCountByTopic(topic);
            
            return {
                questions: questions.map(q => q.toObject()),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Error getting questions with pagination:', error);
            return { questions: [], pagination: { page, limit, total: 0, pages: 0 } };
        }
    }

    async disconnect() {
        if (this.isConnected) {
            await mongoConnection.disconnect();
            this.isConnected = false;
        }
    }
}

// Factory functions for backward compatibility
async function saveQuestions(topic, questions) {
    const storage = new MongoStorage();
    try {
        return await storage.saveQuestions(topic, questions);
    } finally {
        await storage.disconnect();
    }
}

async function getStats() {
    const storage = new MongoStorage();
    try {
        return await storage.getStats();
    } finally {
        await storage.disconnect();
    }
}

module.exports = {
    MongoStorage,
    saveQuestions,
    getStats
}; 