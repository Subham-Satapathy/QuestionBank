#!/usr/bin/env node

const inquirer = require('inquirer');
const { fetchQuestions } = require('../api/api');
const { saveQuestions, getStats } = require('../storage/mongoStorage');
const { formatTopicName } = require('../../utils/utils');
const BackupManager = require('../../utils/backup');
const RecursiveFetcher = require('../recursiveFetcher');
const appConfig = require('../../config/app');

async function main() {
    console.log('🎯 Welcome to Question Bank CLI!');
    console.log('Fetch and manage coding questions with duplicate detection.\n');

    try {
        // Show current stats
        await showStats();
        
        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'fetchMode',
                message: 'Choose fetching mode:',
                choices: [
                    { name: '📥 Single Batch - Fetch questions in one batch', value: 'single' },
                    { name: '🔄 Recursive - Fetch until target count is reached', value: 'recursive' }
                ],
                default: 0
            },
            {
                type: 'list',
                name: 'topic',
                message: 'Choose a programming topic:',
                choices: appConfig.topics.map(topic => ({
                    name: formatTopicName(topic),
                    value: topic
                }))
            },
            {
                type: 'list',
                name: 'model',
                message: 'Choose AI model:',
                choices: appConfig.models.map(model => ({
                    name: `${model.id === 'deepseek' ? '🤖' : '🧠'} ${model.name} - ${model.description}`,
                    value: model.id
                })),
                default: 0
            },
            {
                type: 'list',
                name: 'difficulty',
                message: 'Choose difficulty level:',
                choices: [
                    { name: '🟢 Easy - Basic concepts and simple problems', value: 'easy' },
                    { name: '🟡 Medium - Intermediate algorithms and data structures', value: 'medium' },
                    { name: '🔴 Hard - Advanced algorithms and complex problems', value: 'hard' },
                    { name: '🌈 Mixed - Combination of all difficulty levels', value: 'mixed' }
                ],
                default: 3
            }
        ]);

        // Add conditional prompts based on fetch mode
        let additionalAnswers;
        if (answers.fetchMode === 'single') {
            additionalAnswers = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'count',
                    message: 'How many questions would you like to fetch?',
                    choices: appConfig.questionCounts.map(count => ({
                        name: `${count} questions`,
                        value: count
                    })),
                    default: 1
                },
                {
                    type: 'confirm',
                    name: 'proceed',
                    message: 'Proceed with fetching questions?',
                    default: true
                }
            ]);
        } else {
            // Recursive mode prompts
            additionalAnswers = await inquirer.prompt([
                {
                    type: 'number',
                    name: 'targetCount',
                    message: 'What is your target number of questions in the database?',
                    default: 50,
                    validate: (value) => {
                        if (value <= 0) return 'Target count must be greater than 0';
                        if (value > appConfig.recursiveFetching.maxTotalQuestions) {
                            return `Target count cannot exceed ${appConfig.recursiveFetching.maxTotalQuestions}`;
                        }
                        return true;
                    }
                },
                {
                    type: 'list',
                    name: 'batchSize',
                    message: 'How many questions per API call?',
                    choices: appConfig.recursiveFetching.batchSizes.map(size => ({
                        name: `${size} questions per batch`,
                        value: size
                    })),
                    default: appConfig.recursiveFetching.batchSizes.indexOf(appConfig.recursiveFetching.defaultBatchSize)
                },
                {
                    type: 'confirm',
                    name: 'proceed',
                    message: 'Proceed with recursive fetching?',
                    default: true
                }
            ]);
        }

        const allAnswers = { ...answers, ...additionalAnswers };

        if (!allAnswers.proceed) {
            console.log('👋 Operation cancelled. Goodbye!');
            return;
        }

        const { fetchMode, topic, model, difficulty } = allAnswers;
        const topicName = formatTopicName(topic);
        const difficultyText = difficulty === 'mixed' ? 'mixed difficulty' : `${difficulty} level`;
        const selectedModel = appConfig.models.find(m => m.id === model);
        const modelName = selectedModel ? selectedModel.name : model;

        if (fetchMode === 'single') {
            await handleSingleFetch(allAnswers, topicName, difficultyText, modelName);
        } else {
            await handleRecursiveFetch(allAnswers, topicName, difficultyText, modelName);
        }
        
        // Ask if user wants to continue
        const { continueSession } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'continueSession',
                message: 'Would you like to fetch questions for another topic?',
                default: false
            }
        ]);

        if (continueSession) {
            console.log('\n' + '='.repeat(50) + '\n');
            await main(); // Recursive call for another session
        } else {
            console.log('\n🎉 Thank you for using Question Bank CLI!');
            console.log('☁️ Your questions are saved in MongoDB Atlas.');
            console.log('💡 Each question includes multiple solution approaches for learning.');
        }
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        
        if (error.message.includes('API_KEY')) {
            console.log('\n💡 Setup Help:');
            console.log('   1. Create a .env file in the project root');
            console.log('   2. Add: API_KEY=your_openrouter_api_key');
            console.log('   3. Get your API key from OpenRouter platform');
            console.log('   4. Make sure you have access to deepseek/deepseek-chat-v3-0324:free model');
        }
        
        process.exit(1);
    }
}

async function showStats() {
    try {
        const stats = await getStats();
        const totalQuestions = Object.values(stats).reduce((sum, count) => sum + count, 0);
        
        if (totalQuestions > 0) {
            console.log('📈 Current Question Bank Stats:');
            Object.entries(stats).forEach(([topic, count]) => {
                if (count > 0) {
                    console.log(`   • ${formatTopicName(topic)}: ${count} questions`);
                }
            });
            console.log(`   📊 Total: ${totalQuestions} questions\n`);
        } else {
            console.log('📝 No questions saved yet. Let\'s fetch some!\n');
        }
    } catch (error) {
        // Silently handle stats errors - not critical for main functionality
        console.log('📝 Ready to fetch your first questions!\n');
    }
}

async function handleSingleFetch(answers, topicName, difficultyText, modelName) {
    const { topic, model, difficulty, count } = answers;
    
    console.log(`\n📚 Fetching ${count} ${topicName} questions (${difficultyText}) using ${modelName}...`);
    console.log('⏳ This may take a few moments...\n');
    
    // Fetch questions from API
    const questions = await fetchQuestions(topic, count, difficulty, model);
    
    if (!questions || questions.length === 0) {
        console.log('❌ No questions were fetched from the API.');
        console.log('💡 This could be due to:');
        console.log('   • Invalid API key');
        console.log('   • Network connectivity issues');
        console.log('   • API service temporarily unavailable');
        console.log('   • Malformed response from the API');
        return;
    }

    console.log(`✅ Successfully fetched ${questions.length} questions!`);
    
    // Create backup manager
    const backupManager = new BackupManager();
    
    // Save questions to backup file first
    console.log('\n💾 Creating backup of questions...');
    const backupFile = await backupManager.saveQuestionsToFile(topic, questions, model, difficulty);
    
    // Display question preview
    console.log('\n📋 Question Preview:');
    questions.forEach((q, index) => {
        console.log(`   ${index + 1}. [${q.difficulty.toUpperCase()}] ${q.question.substring(0, 80)}${q.question.length > 80 ? '...' : ''}`);
        if (q.options && q.options.length > 0) {
            console.log(`      💡 ${q.options.length} solution approaches included`);
        }
        if (q.answer) {
            console.log(`      ✅ Correct answer provided`);
        }
    });
    
    // Save questions with duplicate detection
    console.log('\n💾 Saving questions to database...');
    let result;
    try {
        result = await saveQuestions(topic, questions);
    } catch (error) {
        console.error('❌ Database save failed:', error.message);
        console.log('💾 Questions are safely backed up in:', backupFile);
        console.log('🔄 You can retry database insertion later');
        
        // Ask if user wants to see backup stats
        const { showBackupStats } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'showBackupStats',
                message: 'Would you like to see backup statistics?',
                default: false
            }
        ]);
        
        if (showBackupStats) {
            await showBackupStats(backupManager);
        }
        
        return;
    }
    
    // Display results
    console.log('\n📊 Results Summary:');
    console.log(`   • New questions saved: ${result.saved}`);
    console.log(`   • Duplicates skipped: ${result.duplicates}`);
    console.log(`   • Total questions in ${topicName}: ${result.total}`);
    console.log(`   • Difficulty: ${difficultyText}`);
}

async function handleRecursiveFetch(answers, topicName, difficultyText, modelName) {
    const { topic, model, difficulty, targetCount, batchSize } = answers;
    
    console.log(`\n🔄 Starting recursive fetching for ${topicName}`);
    console.log(`🎯 Target: ${targetCount} questions | Batch size: ${batchSize} | Model: ${modelName}`);
    console.log(`⏱️  Delay between batches: ${appConfig.recursiveFetching.delayBetweenBatches}ms\n`);
    
    // Create recursive fetcher
    const recursiveFetcher = new RecursiveFetcher();
    
    // Set up progress monitoring
    let lastProgressUpdate = 0;
    const progressCallback = (progress) => {
        const now = Date.now();
        if (now - lastProgressUpdate > appConfig.recursiveFetching.progressUpdateInterval) {
            console.log(`📊 Progress: ${progress.current}/${progress.target} (${progress.progress}%)`);
            console.log(`   • Batches completed: ${progress.stats.batchesCompleted}`);
            console.log(`   • Total fetched: ${progress.stats.totalFetched}`);
            console.log(`   • Total saved: ${progress.stats.totalSaved}`);
            console.log(`   • Duplicates: ${progress.stats.totalDuplicates}`);
            lastProgressUpdate = now;
        }
    };
    
    try {
        // Start recursive fetching
        const finalStats = await recursiveFetcher.startRecursiveFetching(
            topic, 
            targetCount, 
            difficulty, 
            model, 
            batchSize, 
            progressCallback
        );
        
        // Display final results
        console.log('\n🎉 Recursive Fetching Complete!');
        console.log('📊 Final Results:');
        console.log(`   • Target: ${finalStats.targetCount} questions`);
        console.log(`   • Final count: ${finalStats.finalCount} questions`);
        console.log(`   • Success: ${finalStats.success ? '✅ Yes' : '❌ No'}`);
        console.log(`   • Progress: ${finalStats.progress}%`);
        console.log(`   • Duration: ${finalStats.duration} minutes`);
        console.log(`   • Total batches: ${finalStats.stats.batchesCompleted}`);
        console.log(`   • Total fetched: ${finalStats.stats.totalFetched}`);
        console.log(`   • Total saved: ${finalStats.stats.totalSaved}`);
        console.log(`   • Total duplicates: ${finalStats.stats.totalDuplicates}`);
        
        if (!finalStats.success) {
            console.log('\n⚠️  Target not reached. This could be due to:');
            console.log('   • API rate limiting');
            console.log('   • High duplicate rate');
            console.log('   • Network issues');
            console.log('   • API service limitations');
        }
        
    } catch (error) {
        console.error('❌ Recursive fetching failed:', error.message);
        
        if (error.message.includes('API_KEY')) {
            console.log('\n💡 Setup Help:');
            console.log('   1. Create a .env file in the project root');
            console.log('   2. Add: API_KEY=your_openrouter_api_key');
            console.log('   3. Get your API key from OpenRouter platform');
            console.log('   4. Make sure you have access to deepseek/deepseek-chat-v3-0324:free model');
        }
    }
}

async function showBackupStats(backupManager) {
    try {
        console.log('\n📊 Backup Statistics:');
        const stats = await backupManager.getBackupStats();
        
        if (Object.keys(stats).length === 0) {
            console.log('   📝 No backup files found');
            return;
        }
        
        Object.values(stats).forEach(stat => {
            console.log(`   • ${formatTopicName(stat.topic)} (${stat.model}): ${stat.totalQuestions} questions in ${stat.files.length} files`);
        });
        
        console.log('\n💡 Backup files are stored in the "backups" directory');
    } catch (error) {
        console.error('❌ Error showing backup stats:', error.message);
    }
}

if (require.main === module) {
    main();
}

module.exports = { main }; 