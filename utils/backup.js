const fs = require('fs').promises;
const path = require('path');

class BackupManager {
    constructor() {
        this.backupDir = path.join(process.cwd(), 'backups');
    }

    async ensureBackupDirectory() {
        try {
            await fs.access(this.backupDir);
        } catch (error) {
            await fs.mkdir(this.backupDir, { recursive: true });
        }
    }

    async saveQuestionsToFile(topic, questions, model, difficulty) {
        try {
            await this.ensureBackupDirectory();
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${topic}_${model}_${difficulty}_${timestamp}.json`;
            const filepath = path.join(this.backupDir, filename);
            
            const backupData = {
                metadata: {
                    topic,
                    model,
                    difficulty,
                    timestamp: new Date().toISOString(),
                    count: questions.length,
                    source: 'AI API'
                },
                questions
            };
            
            await fs.writeFile(filepath, JSON.stringify(backupData, null, 2));
            console.log(`💾 Backup saved: ${filename}`);
            
            return filepath;
        } catch (error) {
            console.error('❌ Error saving backup:', error.message);
            return null;
        }
    }

    async loadQuestionsFromFile(filepath) {
        try {
            const data = await fs.readFile(filepath, 'utf8');
            const backupData = JSON.parse(data);
            return backupData.questions;
        } catch (error) {
            console.error('❌ Error loading backup:', error.message);
            return [];
        }
    }

    async listBackupFiles() {
        try {
            await this.ensureBackupDirectory();
            const files = await fs.readdir(this.backupDir);
            return files.filter(file => file.endsWith('.json'));
        } catch (error) {
            console.error('❌ Error listing backup files:', error.message);
            return [];
        }
    }

    async getBackupStats() {
        try {
            const files = await this.listBackupFiles();
            const stats = {};
            
            for (const file of files) {
                const filepath = path.join(this.backupDir, file);
                const data = await fs.readFile(filepath, 'utf8');
                const backupData = JSON.parse(data);
                
                const key = `${backupData.metadata.topic}_${backupData.metadata.model}`;
                if (!stats[key]) {
                    stats[key] = {
                        topic: backupData.metadata.topic,
                        model: backupData.metadata.model,
                        totalQuestions: 0,
                        files: []
                    };
                }
                
                stats[key].totalQuestions += backupData.metadata.count;
                stats[key].files.push({
                    filename: file,
                    count: backupData.metadata.count,
                    timestamp: backupData.metadata.timestamp,
                    difficulty: backupData.metadata.difficulty
                });
            }
            
            return stats;
        } catch (error) {
            console.error('❌ Error getting backup stats:', error.message);
            return {};
        }
    }

    async cleanupOldBackups(daysToKeep = 7) {
        try {
            const files = await this.listBackupFiles();
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            
            let deletedCount = 0;
            
            for (const file of files) {
                const filepath = path.join(this.backupDir, file);
                const stats = await fs.stat(filepath);
                
                if (stats.mtime < cutoffDate) {
                    await fs.unlink(filepath);
                    deletedCount++;
                    console.log(`🗑️  Deleted old backup: ${file}`);
                }
            }
            
            if (deletedCount > 0) {
                console.log(`✅ Cleaned up ${deletedCount} old backup files`);
            }
            
            return deletedCount;
        } catch (error) {
            console.error('❌ Error cleaning up backups:', error.message);
            return 0;
        }
    }
}

module.exports = BackupManager; 