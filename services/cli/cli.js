#!/usr/bin/env node

const inquirer = require('inquirer');
const { fetchQuestions } = require('../api/api');
const { saveQuestions, getStats } = require('../storage/mongoStorage');
const { formatTopicName } = require('../../utils/utils');
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
                name: 'topic',
                message: 'Choose a programming topic:',
                choices: appConfig.topics.map(topic => ({
                    name: formatTopicName(topic),
                    value: topic
                }))
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
            },
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

        if (!answers.proceed) {
            console.log('👋 Operation cancelled. Goodbye!');
            return;
        }

        const { topic, difficulty, count } = answers;
        const topicName = formatTopicName(topic);
        const difficultyText = difficulty === 'mixed' ? 'mixed difficulty' : `${difficulty} level`;

        console.log(`\n📚 Fetching ${count} ${topicName} questions (${difficultyText}) from Deepseek API...`);
        console.log('⏳ This may take a few moments...\n');
        
        // Fetch questions from API
        const questions = await fetchQuestions(topic, count, difficulty);
        
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
        console.log('\n💾 Saving questions with duplicate detection...');
        const result = await saveQuestions(topic, questions);
        
        // Display results
        console.log('\n📊 Results Summary:');
        console.log(`   • New questions saved: ${result.saved}`);
        console.log(`   • Duplicates skipped: ${result.duplicates}`);
        console.log(`   • Total questions in ${topicName}: ${result.total}`);
        console.log(`   • Difficulty: ${difficultyText}`);
        
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

if (require.main === module) {
    main();
}

module.exports = { main }; 