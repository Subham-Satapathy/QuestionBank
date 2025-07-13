const { fetchQuestions } = require('./api/api');
const { saveQuestions } = require('./storage/mongoStorage');
const appConfig = require('../config/app');

class RecursiveFetcher {
    constructor() {
        this.config = appConfig.recursiveFetching;
        this.isRunning = false;
        this.shouldStop = false;
        this.stats = {
            totalFetched: 0,
            totalSaved: 0,
            totalDuplicates: 0,
            consecutiveFailures: 0,
            batchesCompleted: 0,
            startTime: null,
            lastProgressUpdate: 0
        };
    }

    /**
     * Start recursive fetching until the requested number of new questions are stored in this session
     * @param {string} topic - The programming topic
     * @param {number} targetCount - Number of new questions to store in this session
     * @param {string} difficulty - Difficulty level
     * @param {string} model - AI model to use
     * @param {number} batchSize - Questions per API call
     * @param {Function} onProgress - Progress callback function
     * @returns {Promise<Object>} Final statistics
     */
    async startRecursiveFetching(topic, targetCount, difficulty = 'mixed', model = 'deepseek', batchSize = null, onProgress = null) {
        if (this.isRunning) {
            throw new Error('Recursive fetching is already running');
        }

        if (targetCount > this.config.maxTotalQuestions) {
            throw new Error(`Target count ${targetCount} exceeds maximum allowed (${this.config.maxTotalQuestions})`);
        }

        if (!batchSize) {
            batchSize = this.config.defaultBatchSize;
        }

        if (!this.config.batchSizes.includes(batchSize)) {
            throw new Error(`Invalid batch size. Must be one of: ${this.config.batchSizes.join(', ')}`);
        }

        this.isRunning = true;
        this.shouldStop = false;
        this.stats = {
            totalFetched: 0,
            totalSaved: 0,
            totalDuplicates: 0,
            consecutiveFailures: 0,
            batchesCompleted: 0,
            startTime: Date.now(),
            lastProgressUpdate: 0
        };

        console.log(`🚀 Starting recursive fetching for ${topic}`);
        console.log(`📊 Target: Store ${targetCount} new questions | Batch size: ${batchSize} | Model: ${model}`);
        console.log(`⏱️  Delay between batches: ${this.config.delayBetweenBatches}ms\n`);

        try {
            // Start recursive fetching
            await this.fetchUntilTarget(topic, targetCount, difficulty, model, batchSize, onProgress);
            return this.getFinalStats(targetCount);
        } catch (error) {
            console.error('❌ Recursive fetching failed:', error.message);
            throw error;
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Main recursive fetching loop: store targetCount new questions in this session
     */
    async fetchUntilTarget(topic, targetCount, difficulty, model, batchSize, onProgress) {
        let sessionSaved = 0;
        let sessionDuplicates = 0;
        let sessionFetched = 0;
        let lastProgressUpdate = 0;

        while (!this.shouldStop && sessionSaved < targetCount) {
            try {
                // Calculate how many to fetch in this batch
                const remaining = targetCount - sessionSaved;
                const batchToFetch = Math.min(batchSize, remaining);

                console.log(`\n📥 Fetching batch ${this.stats.batchesCompleted + 1} (${batchToFetch} questions)...`);

                // Fetch questions
                const questions = await fetchQuestions(topic, batchToFetch, difficulty, model);

                if (!questions || questions.length === 0) {
                    console.log('⚠️  No questions returned from API');
                    this.stats.consecutiveFailures++;
                    
                    if (this.stats.consecutiveFailures >= this.config.maxConsecutiveFailures) {
                        console.log(`❌ Stopping due to ${this.config.maxConsecutiveFailures} consecutive failures`);
                        break;
                    }

                    await this.delay(this.config.retryDelay);
                    continue;
                }

                console.log(`✅ Fetched ${questions.length} questions from API`);

                // Save questions
                const result = await saveQuestions(topic, questions);
                
                this.stats.totalFetched += questions.length;
                this.stats.totalSaved += result.saved;
                this.stats.totalDuplicates += result.duplicates;
                this.stats.batchesCompleted++;
                this.stats.consecutiveFailures = 0; // Reset on success

                sessionFetched += questions.length;
                sessionSaved += result.saved;
                sessionDuplicates += result.duplicates;

                console.log(`💾 Saved: ${result.saved} | Duplicates: ${result.duplicates} | Session saved: ${sessionSaved}/${targetCount}`);

                // Update progress
                if (onProgress && Date.now() - lastProgressUpdate > this.config.progressUpdateInterval) {
                    onProgress({
                        current: sessionSaved,
                        target: targetCount,
                        progress: Math.round((sessionSaved / targetCount) * 100),
                        stats: { ...this.stats }
                    });
                    lastProgressUpdate = Date.now();
                }

                // If no new questions were saved, increment failure count
                if (result.saved === 0) {
                    this.stats.consecutiveFailures++;
                    if (this.stats.consecutiveFailures >= this.config.maxConsecutiveFailures) {
                        console.log(`❌ Stopping due to ${this.config.maxConsecutiveFailures} consecutive failures (no new questions saved)`);
                        break;
                    }
                }

                // Delay before next batch
                if (!this.shouldStop && sessionSaved < targetCount) {
                    console.log(`⏳ Waiting ${this.config.delayBetweenBatches}ms before next batch...`);
                    await this.delay(this.config.delayBetweenBatches);
                }

            } catch (error) {
                console.error('❌ Error in recursive fetching:', error.message);
                this.stats.consecutiveFailures++;
                
                if (this.stats.consecutiveFailures >= this.config.maxConsecutiveFailures) {
                    console.log(`❌ Stopping due to ${this.config.maxConsecutiveFailures} consecutive failures`);
                    break;
                }

                await this.delay(this.config.retryDelay);
            }
        }

        if (this.shouldStop) {
            console.log('\n⏹️  Recursive fetching stopped by user');
        }
    }

    /**
     * Stop the recursive fetching process
     */
    stop() {
        if (this.isRunning) {
            this.shouldStop = true;
            console.log('\n🛑 Stopping recursive fetching...');
        }
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            stats: { ...this.stats }
        };
    }

    /**
     * Get final statistics
     */
    getFinalStats(targetCount) {
        const duration = Date.now() - this.stats.startTime;
        const durationMinutes = Math.round(duration / 60000 * 100) / 100;

        return {
            success: this.stats.totalSaved >= targetCount,
            finalSaved: this.stats.totalSaved,
            targetCount: targetCount,
            progress: Math.round((this.stats.totalSaved / targetCount) * 100),
            duration: durationMinutes,
            stats: { ...this.stats }
        };
    }

    /**
     * Utility function for delays
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = RecursiveFetcher; 