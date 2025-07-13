const mongoConnection = require('./mongo');
const Question = require('./models/Question');

async function clearDatabase() {
    try {
        console.log('🗑️  Clearing database...');
        
        await mongoConnection.connect();
        
        const result = await Question.deleteMany({});
        
        console.log(`✅ Deleted ${result.deletedCount} questions from database`);
        
    } catch (error) {
        console.error('❌ Error clearing database:', error);
    } finally {
        await mongoConnection.disconnect();
    }
}

if (require.main === module) {
    clearDatabase().catch(console.error);
}

module.exports = { clearDatabase }; 