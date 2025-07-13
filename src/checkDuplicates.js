const fs = require('fs').promises;
const path = require('path');
const { generateHash } = require('./utils');

class DuplicateChecker {
    constructor() {
        this.dataDir = path.join(__dirname, '..', 'data');
        this.allQuestions = [];
        this.duplicates = [];
    }

    async checkDuplicates() {
        try {
            console.log('🔍 Checking for duplicate questions across all JSON files...\n');
            
            // Get all JSON files
            const files = await this.getDataFiles();
            console.log(`📁 Found ${files.length} data files to analyze\n`);
            
            // Load all questions from all files
            for (const file of files) {
                await this.loadQuestionsFromFile(file);
            }
            
            console.log(`📊 Total questions loaded: ${this.allQuestions.length}\n`);
            
            // Find duplicates
            this.findDuplicates();
            
            // Report results
            this.reportResults();
            
        } catch (error) {
            console.error('❌ Error checking duplicates:', error);
        }
    }

    async getDataFiles() {
        try {
            const files = await fs.readdir(this.dataDir);
            return files
                .filter(file => file.endsWith('.json') && file !== 'hashes.json')
                .map(file => path.join(this.dataDir, file));
        } catch (error) {
            console.error('Error reading data directory:', error);
            return [];
        }
    }

    async loadQuestionsFromFile(filePath) {
        const topic = path.basename(filePath, '.json');
        console.log(`📄 Loading ${topic}.json...`);
        
        try {
            const data = await fs.readFile(filePath, 'utf8');
            const questions = JSON.parse(data);
            
            questions.forEach(question => {
                // Add source file information
                question.sourceFile = topic;
                question.sourceId = question.id;
                
                // Generate hash if not present
                if (!question.hash) {
                    question.hash = generateHash(question.question + question.topic);
                }
                
                this.allQuestions.push(question);
            });
            
            console.log(`  ✅ Loaded ${questions.length} questions from ${topic}.json`);
            
        } catch (error) {
            console.error(`  ❌ Error reading ${filePath}:`, error);
        }
    }

    findDuplicates() {
        console.log('🔍 Analyzing for duplicates...\n');
        
        // Group by hash
        const hashGroups = {};
        this.allQuestions.forEach(question => {
            if (!hashGroups[question.hash]) {
                hashGroups[question.hash] = [];
            }
            hashGroups[question.hash].push(question);
        });
        
        // Find groups with more than one question (exact duplicates)
        Object.entries(hashGroups).forEach(([hash, questions]) => {
            if (questions.length > 1) {
                this.duplicates.push({
                    type: 'exact',
                    hash,
                    questions,
                    count: questions.length
                });
            }
        });
        
        // Also check for similar questions (same question text but different hashes)
        this.findSimilarQuestions();
    }

    findSimilarQuestions() {
        const questionTextMap = {};
        
        this.allQuestions.forEach(question => {
            const normalizedText = this.normalizeQuestionText(question.question);
            
            if (!questionTextMap[normalizedText]) {
                questionTextMap[normalizedText] = [];
            }
            questionTextMap[normalizedText].push(question);
        });
        
        // Find similar questions
        Object.entries(questionTextMap).forEach(([text, questions]) => {
            if (questions.length > 1) {
                // Check if they have different hashes (meaning they're not exact duplicates)
                const uniqueHashes = new Set(questions.map(q => q.hash));
                if (uniqueHashes.size > 1) {
                    this.duplicates.push({
                        type: 'similar',
                        text: text,
                        questions,
                        count: questions.length
                    });
                }
            }
        });
    }

    normalizeQuestionText(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
    }

    reportResults() {
        console.log('📊 Duplicate Analysis Results:\n');
        
        if (this.duplicates.length === 0) {
            console.log('✅ No duplicates found! All questions are unique.');
            return;
        }
        
        // Separate exact duplicates from similar questions
        const exactDuplicates = this.duplicates.filter(d => d.type === 'exact');
        const similarQuestions = this.duplicates.filter(d => d.type === 'similar');
        
        console.log(`⚠️  Found ${this.duplicates.length} duplicate groups:\n`);
        
        if (exactDuplicates.length > 0) {
            console.log('🔴 Exact Duplicates (same hash):');
            exactDuplicates.forEach((duplicate, index) => {
                console.log(`   ${index + 1}. Hash: ${duplicate.hash.substring(0, 20)}... (${duplicate.count} instances)`);
                duplicate.questions.forEach((q, qIndex) => {
                    console.log(`      ${qIndex + 1}. [${q.sourceFile}] ID: ${q.sourceId} - "${q.question.substring(0, 60)}..."`);
                });
                console.log('');
            });
        }
        
        if (similarQuestions.length > 0) {
            console.log('🟡 Similar Questions (same text, different hash):');
            similarQuestions.forEach((duplicate, index) => {
                console.log(`   ${index + 1}. Question: "${duplicate.text.substring(0, 80)}..." (${duplicate.count} instances)`);
                duplicate.questions.forEach((q, qIndex) => {
                    console.log(`      ${qIndex + 1}. [${q.sourceFile}] ID: ${q.sourceId} - Hash: ${q.hash.substring(0, 20)}...`);
                });
                console.log('');
            });
        }
        
        // Summary statistics
        const totalDuplicates = this.duplicates.reduce((sum, d) => sum + d.count, 0);
        const uniqueQuestions = this.allQuestions.length - totalDuplicates + this.duplicates.length;
        
        console.log('📈 Summary:');
        console.log(`   • Total questions: ${this.allQuestions.length}`);
        console.log(`   • Unique questions: ${uniqueQuestions}`);
        console.log(`   • Exact duplicates: ${exactDuplicates.length} groups`);
        console.log(`   • Similar questions: ${similarQuestions.length} groups`);
        console.log(`   • Duplicate instances: ${totalDuplicates}`);
        console.log(`   • Duplication rate: ${((totalDuplicates / this.allQuestions.length) * 100).toFixed(1)}%`);
    }

    async generateCleanFiles() {
        console.log('\n🧹 Generating clean files without duplicates...\n');
        
        // Group questions by topic
        const questionsByTopic = {};
        const seenHashes = new Set();
        
        this.allQuestions.forEach(question => {
            if (!seenHashes.has(question.hash)) {
                seenHashes.add(question.hash);
                
                if (!questionsByTopic[question.topic]) {
                    questionsByTopic[question.topic] = [];
                }
                
                // Remove source file info for clean output
                const cleanQuestion = { ...question };
                delete cleanQuestion.sourceFile;
                delete cleanQuestion.sourceId;
                
                questionsByTopic[question.topic].push(cleanQuestion);
            }
        });
        
        // Write clean files
        for (const [topic, questions] of Object.entries(questionsByTopic)) {
            const filePath = path.join(this.dataDir, `${topic}_clean.json`);
            await fs.writeFile(filePath, JSON.stringify(questions, null, 2));
            console.log(`✅ Created ${filePath} with ${questions.length} unique questions`);
        }
        
        console.log(`\n📊 Clean files created with ${seenHashes.size} unique questions total`);
    }
}

// CLI interface
async function main() {
    const checker = new DuplicateChecker();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'check':
            await checker.checkDuplicates();
            break;
        case 'clean':
            await checker.checkDuplicates();
            await checker.generateCleanFiles();
            break;
        default:
            console.log('Usage: node src/checkDuplicates.js [check|clean]');
            console.log('  check - Analyze and report duplicates');
            console.log('  clean - Check duplicates and generate clean files');
            break;
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = DuplicateChecker; 