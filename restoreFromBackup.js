#!/usr/bin/env node

const inquirer = require('inquirer');
const path = require('path');
const BackupManager = require('./utils/backup');
const { saveQuestions } = require('./services/storage/mongoStorage');
const { formatTopicName } = require('./utils/utils');

async function restoreFromBackup() {
    console.log('🔄 Question Bank Backup Restorer');
    console.log('Restore questions from backup files to database\n');

    try {
        const backupManager = new BackupManager();
        
        // Get backup statistics
        const stats = await backupManager.getBackupStats();
        
        if (Object.keys(stats).length === 0) {
            console.log('📝 No backup files found in the backups directory');
            console.log('💡 Backup files are created automatically when fetching questions');
            return;
        }
        
        console.log('📊 Available Backup Files:');
        Object.values(stats).forEach((stat, index) => {
            console.log(`   ${index + 1}. ${formatTopicName(stat.topic)} (${stat.model}): ${stat.totalQuestions} questions in ${stat.files.length} files`);
        });
        
        // Get list of all backup files
        const backupFiles = await backupManager.listBackupFiles();
        
        if (backupFiles.length === 0) {
            console.log('📝 No backup files found');
            return;
        }
        
        const { selectedFiles } = await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'selectedFiles',
                message: 'Select backup files to restore:',
                choices: backupFiles.map(file => ({
                    name: file,
                    value: file
                }))
            }
        ]);
        
        if (selectedFiles.length === 0) {
            console.log('👋 No files selected. Goodbye!');
            return;
        }
        
        console.log(`\n🔄 Restoring ${selectedFiles.length} backup files...`);
        
        let totalRestored = 0;
        let totalSkipped = 0;
        
        for (const filename of selectedFiles) {
            try {
                console.log(`\n📁 Processing: ${filename}`);
                
                const filepath = path.join(backupManager.backupDir, filename);
                const questions = await backupManager.loadQuestionsFromFile(filepath);
                
                if (questions.length === 0) {
                    console.log('   ⚠️  No questions found in file');
                    continue;
                }
                
                // Get topic from first question
                const topic = questions[0].topic;
                
                console.log(`   📝 Found ${questions.length} questions for ${formatTopicName(topic)}`);
                
                // Save to database
                const result = await saveQuestions(topic, questions);
                
                console.log(`   ✅ Restored: ${result.saved} questions`);
                console.log(`   ⚠️  Skipped: ${result.duplicates} duplicates`);
                
                totalRestored += result.saved;
                totalSkipped += result.duplicates;
                
            } catch (error) {
                console.error(`   ❌ Error processing ${filename}:`, error.message);
            }
        }
        
        console.log('\n📊 Restoration Summary:');
        console.log(`   • Total questions restored: ${totalRestored}`);
        console.log(`   • Total duplicates skipped: ${totalSkipped}`);
        console.log(`   • Files processed: ${selectedFiles.length}`);
        
        // Ask if user wants to clean up old backups
        const { cleanupBackups } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'cleanupBackups',
                message: 'Would you like to clean up old backup files (older than 7 days)?',
                default: false
            }
        ]);
        
        if (cleanupBackups) {
            const deletedCount = await backupManager.cleanupOldBackups(7);
            console.log(`🗑️  Cleaned up ${deletedCount} old backup files`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    restoreFromBackup();
}

module.exports = { restoreFromBackup }; 