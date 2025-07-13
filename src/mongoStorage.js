const Question = require('./models/Question');
const mongoConnection = require('./mongo');
const { generateHash } = require('./utils');

class MongoStorage {
    constructor() {
        this.isConnected = false;
    }

    async ensureConnection() {
        if (!this.isConnected) {
            await mongoConnection.connect();
            this.isConnected = true;
        }
    }

    async loadHashes() {
        await this.ensureConnection();
        
        try {
            const questions = await Question.find({}, 'hash topic id savedAt');
            const hashes = {};
            
            questions.forEach(q => {
                hashes[q.hash] = {
                    topic: q.topic,
                    id: q.id,
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
            // Load existing hashes to check for duplicates
            const existingHashes = await this.loadHashes();
            
            // Filter out duplicates and prepare new questions
            const uniqueQuestions = [];
            const skippedCount = 0;
            
            for (const question of newQuestions) {
                const hash = generateHash(question.question + question.topic);
                
                if (!existingHashes[hash]) {
                    // Add hash and timestamp if not present
                    if (!question.hash) {
                        question.hash = hash;
                    }
                    if (!question.savedAt) {
                        question.savedAt = new Date().toISOString();
                    }
                    
                    uniqueQuestions.push(question);
                } else {
                    console.log(`⚠️  Duplicate question detected and skipped: ${question.id}`);
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
                    // Double-check for existing ID before inserting
                    const existingQuestion = await Question.findOne({ id: question.id });
                    if (existingQuestion) {
                        console.log(`⚠️  Skipping question with duplicate ID: ${question.id}`);
                        failedCount++;
                        continue;
                    }
                    
                    const savedQuestion = await Question.create(question);
                    savedQuestions.push(savedQuestion);
                } catch (error) {
                    if (error.code === 11000) {
                        console.log(`⚠️  Skipping question with duplicate key: ${question.id}`);
                        failedCount++;
                    } else {
                        console.error(`❌ Error saving question ${question.id}:`, error.message);
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
            return await Question.findOne({ id });
        } catch (error) {
            console.error('Error getting question by ID:', error);
            return null;
        }
    }

    async updateQuestion(id, updates) {
        await this.ensureConnection();
        
        try {
            return await Question.findOneAndUpdate(
                { id },
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
            return await Question.findOneAndDelete({ id });
        } catch (error) {
            console.error('Error deleting question:', error);
            throw error;
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