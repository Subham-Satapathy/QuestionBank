const fs = require('fs').promises;
const path = require('path');
const mongoConnection = require('./mongo');
const Question = require('./models/Question');
const { generateHash } = require('./utils');

class DataMigrator {
    constructor() {
        this.dataDir = path.join(__dirname, '..', 'data');
    }

    async migrate() {
        try {
            console.log('🚀 Starting migration from JSON files to MongoDB Atlas...');
            
            // Connect to MongoDB
            await mongoConnection.connect();
            
            // Get all JSON files in the data directory
            const files = await this.getDataFiles();
            console.log(`📁 Found ${files.length} data files to migrate`);
            
            let totalMigrated = 0;
            let totalSkipped = 0;
            
            for (const file of files) {
                const result = await this.migrateFile(file);
                totalMigrated += result.migrated;
                totalSkipped += result.skipped;
            }
            
            console.log('\n✅ Migration completed!');
            console.log(`📊 Total questions migrated: ${totalMigrated}`);
            console.log(`⚠️  Total duplicates skipped: ${totalSkipped}`);
            
            // Get final stats
            const stats = await Question.getStats();
            console.log('\n📈 Final database statistics:');
            stats.forEach(stat => {
                console.log(`  ${stat.topic}: ${stat.total} questions (${stat.easy} easy, ${stat.medium} medium, ${stat.hard} hard)`);
            });
            
        } catch (error) {
            console.error('❌ Migration failed:', error);
            throw error;
        } finally {
            await mongoConnection.disconnect();
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

    async migrateFile(filePath) {
        const topic = path.basename(filePath, '.json');
        console.log(`\n📄 Migrating ${topic}.json...`);
        
        try {
            // Read JSON file
            const data = await fs.readFile(filePath, 'utf8');
            const questions = JSON.parse(data);
            
            console.log(`  📝 Found ${questions.length} questions in ${topic}.json`);
            
            let migrated = 0;
            let skipped = 0;
            
            // Process each question
            for (const question of questions) {
                try {
                    // Ensure required fields
                    if (!question.topic) {
                        question.topic = topic;
                    }
                    
                    // Make ID unique by combining topic and original ID
                    const originalId = question.id;
                    // Add timestamp and random suffix to ensure uniqueness
                    const timestamp = Date.now();
                    const randomSuffix = Math.random().toString(36).substring(2, 8);
                    question.id = `${topic}_${originalId}_${timestamp}_${randomSuffix}`;
                    
                    // Ensure hash is unique
                    if (!question.hash) {
                        question.hash = generateHash(question.question + question.topic);
                    }
                    
                    if (!question.savedAt) {
                        question.savedAt = new Date().toISOString();
                    }
                    
                    // Provide default example if missing
                    if (!question.example || question.example.trim() === '') {
                        question.example = `Example for: ${question.question.substring(0, 50)}...`;
                    }
                    
                    // Check if question already exists by hash
                    const existing = await Question.findOne({ hash: question.hash });
                    
                    if (existing) {
                        console.log(`    ⚠️  Skipping duplicate: ${originalId}`);
                        skipped++;
                    } else {
                        // Create new question document
                        const newQuestion = new Question(question);
                        await newQuestion.save();
                        migrated++;
                        
                        if (migrated % 10 === 0) {
                            console.log(`    ✅ Migrated ${migrated} questions...`);
                        }
                    }
                } catch (error) {
                    console.error(`    ❌ Error migrating question ${question.id}:`, error.message);
                    skipped++;
                }
            }
            
            console.log(`  ✅ Completed ${topic}: ${migrated} migrated, ${skipped} skipped`);
            
            return { migrated, skipped };
            
        } catch (error) {
            console.error(`  ❌ Error reading ${filePath}:`, error);
            return { migrated: 0, skipped: 0 };
        }
    }

    async validateMigration() {
        console.log('\n🔍 Validating migration...');
        
        try {
            await mongoConnection.connect();
            
            const files = await this.getDataFiles();
            let totalValidated = 0;
            
            for (const filePath of files) {
                const topic = path.basename(filePath, '.json');
                
                // Count questions in JSON file
                const data = await fs.readFile(filePath, 'utf8');
                const jsonQuestions = JSON.parse(data);
                
                // Count questions in MongoDB
                const mongoCount = await Question.countDocuments({ topic });
                
                console.log(`  ${topic}: JSON=${jsonQuestions.length}, MongoDB=${mongoCount}`);
                totalValidated += mongoCount;
            }
            
            console.log(`\n📊 Total questions in MongoDB: ${totalValidated}`);
            
        } catch (error) {
            console.error('❌ Validation failed:', error);
        } finally {
            await mongoConnection.disconnect();
        }
    }
}

// CLI interface
async function main() {
    const migrator = new DataMigrator();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'migrate':
            await migrator.migrate();
            break;
        case 'validate':
            await migrator.validateMigration();
            break;
        default:
            console.log('Usage: node src/migrate.js [migrate|validate]');
            console.log('  migrate  - Migrate all JSON files to MongoDB');
            console.log('  validate - Validate the migration results');
            break;
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = DataMigrator; 