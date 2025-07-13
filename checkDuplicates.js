#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { generateHash } = require('./utils/utils');
const { MongoStorage } = require('./services/storage/mongoStorage');

async function checkDuplicates() {
    console.log('🔍 Checking for duplicate questions...\n');

    try {
        // Load backup file
        const backupFile = path.join(__dirname, 'backups', 'react_openai_mixed_2025-07-13T11-53-43-021Z.json');
        const backupData = JSON.parse(await fs.readFile(backupFile, 'utf8'));
        const newQuestions = backupData.questions;

        console.log(`📁 Loaded ${newQuestions.length} questions from backup file`);
        console.log(`📋 Topic: ${backupData.metadata.topic}`);
        console.log(`🤖 Model: ${backupData.metadata.model}`);
        console.log(`🎚️  Difficulty: ${backupData.metadata.difficulty}\n`);

        // Connect to database
        const storage = new MongoStorage();
        await storage.ensureConnection();

        // Get existing questions for the topic
        const existingQuestions = await storage.loadQuestions(backupData.metadata.topic);
        console.log(`📊 Found ${existingQuestions.length} existing questions in database\n`);

        // Check each new question against existing ones
        let duplicateCount = 0;
        let uniqueCount = 0;

        for (const newQuestion of newQuestions) {
            const newHash = generateHash(newQuestion.question + newQuestion.topic);
            console.log(`\n🔍 Checking: "${newQuestion.question.substring(0, 60)}..."`);
            console.log(`   Hash: ${newHash.substring(0, 16)}...`);
            console.log(`   Difficulty: ${newQuestion.difficulty}`);

            // Check for exact hash match
            const exactMatch = existingQuestions.find(q => q.hash === newHash);
            if (exactMatch) {
                console.log(`   ❌ DUPLICATE FOUND!`);
                console.log(`      Existing: "${exactMatch.question.substring(0, 60)}..."`);
                console.log(`      Difficulty: ${exactMatch.difficulty}`);
                duplicateCount++;
            } else {
                // Check for similar questions (fuzzy matching)
                const similarQuestions = existingQuestions.filter(q => {
                    const similarity = calculateSimilarity(newQuestion.question, q.question);
                    return similarity > 0.8; // 80% similarity threshold
                });

                if (similarQuestions.length > 0) {
                    console.log(`   ⚠️  SIMILAR QUESTIONS FOUND (${similarQuestions.length}):`);
                    similarQuestions.forEach((q, index) => {
                        const similarity = calculateSimilarity(newQuestion.question, q.question);
                        console.log(`      ${index + 1}. "${q.question.substring(0, 60)}..." (${Math.round(similarity * 100)}% similar)`);
                    });
                    duplicateCount++;
                } else {
                    console.log(`   ✅ UNIQUE QUESTION`);
                    uniqueCount++;
                }
            }
        }

        console.log(`\n📊 Summary:`);
        console.log(`   • Total questions checked: ${newQuestions.length}`);
        console.log(`   • Duplicates found: ${duplicateCount}`);
        console.log(`   • Unique questions: ${uniqueCount}`);
        console.log(`   • Duplicate rate: ${Math.round((duplicateCount / newQuestions.length) * 100)}%`);

        await storage.disconnect();

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

function calculateSimilarity(str1, str2) {
    // Simple similarity calculation using Levenshtein distance
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

if (require.main === module) {
    checkDuplicates();
}

module.exports = { checkDuplicates }; 