const fs = require('fs').promises;
const path = require('path');
const { generateHash } = require('./utils');

class QuestionStorage {
    constructor() {
        this.dataDir = path.join(__dirname, '..', 'data');
        this.hashesFile = path.join(this.dataDir, 'hashes.json');
    }

    async ensureDataDirectory() {
        try {
            await fs.access(this.dataDir);
        } catch {
            await fs.mkdir(this.dataDir, { recursive: true });
        }
    }

    async loadHashes() {
        try {
            const data = await fs.readFile(this.hashesFile, 'utf8');
            return JSON.parse(data);
        } catch {
            return {};
        }
    }

    async saveHashes(hashes) {
        await fs.writeFile(this.hashesFile, JSON.stringify(hashes, null, 2));
    }

    async loadQuestions(topic) {
        const filePath = path.join(this.dataDir, `${topic}.json`);
        try {
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch {
            return [];
        }
    }

    async saveQuestions(topic, newQuestions) {
        await this.ensureDataDirectory();
        
        // Load existing questions and hashes
        const existingQuestions = await this.loadQuestions(topic);
        const existingHashes = await this.loadHashes();
        
        // Filter out duplicates
        const uniqueQuestions = [];
        const newHashes = { ...existingHashes };
        
        for (const question of newQuestions) {
            const hash = generateHash(question.question + question.topic);
            
            if (!newHashes[hash]) {
                // Add hash and timestamp
                question.hash = hash;
                question.savedAt = new Date().toISOString();
                
                uniqueQuestions.push(question);
                newHashes[hash] = {
                    topic: question.topic,
                    id: question.id,
                    savedAt: question.savedAt
                };
            } else {
                console.log(`⚠️  Duplicate question detected and skipped: ${question.id}`);
            }
        }
        
        if (uniqueQuestions.length === 0) {
            console.log('ℹ️  No new questions to save (all were duplicates)');
            return { saved: 0, duplicates: newQuestions.length };
        }
        
        // Combine with existing questions
        const allQuestions = [...existingQuestions, ...uniqueQuestions];
        
        // Save questions and hashes
        const filePath = path.join(this.dataDir, `${topic}.json`);
        await fs.writeFile(filePath, JSON.stringify(allQuestions, null, 2));
        await this.saveHashes(newHashes);
        
        console.log(`✅ Saved ${uniqueQuestions.length} new questions to ${topic}.json`);
        if (newQuestions.length > uniqueQuestions.length) {
            console.log(`⚠️  Skipped ${newQuestions.length - uniqueQuestions.length} duplicate questions`);
        }
        
        return {
            saved: uniqueQuestions.length,
            duplicates: newQuestions.length - uniqueQuestions.length,
            total: allQuestions.length
        };
    }

    async getStats() {
        await this.ensureDataDirectory();
        const topics = ['javascript', 'typescript', 'nodejs', 'sql', 'react'];
        const stats = {};
        
        for (const topic of topics) {
            const questions = await this.loadQuestions(topic);
            stats[topic] = questions.length;
        }
        
        return stats;
    }
}

async function saveQuestions(topic, questions) {
    const storage = new QuestionStorage();
    return await storage.saveQuestions(topic, questions);
}

async function getStats() {
    const storage = new QuestionStorage();
    return await storage.getStats();
}

module.exports = {
    QuestionStorage,
    saveQuestions,
    getStats
}; 