const mongoose = require('mongoose');
const databaseConfig = require('../../config/database');

class MongoConnection {
    constructor() {
        this.isConnected = false;
        this.connection = null;
    }

    async connect(retryCount = 0) {
        if (this.isConnected) {
            console.log('✅ Already connected to MongoDB Atlas');
            return;
        }

        const maxRetries = 3;
        const retryDelay = 2000; // 2 seconds

        try {
            console.log('🔄 Connecting to MongoDB Atlas...');
            
            // Set up connection event handlers before connecting
            mongoose.connection.on('error', (error) => {
                console.error('❌ MongoDB connection error:', error);
                this.isConnected = false;
            });

            mongoose.connection.on('disconnected', () => {
                console.log('⚠️  MongoDB disconnected');
                this.isConnected = false;
            });

            mongoose.connection.on('connected', () => {
                console.log('✅ MongoDB connection established');
                this.isConnected = true;
            });

            this.connection = await mongoose.connect(
                databaseConfig.mongodb.uri,
                databaseConfig.mongodb.options
            );

            console.log('✅ Connected to MongoDB Atlas');

            // Create indexes
            await this.createIndexes();

        } catch (error) {
            console.error(`❌ Failed to connect to MongoDB Atlas (attempt ${retryCount + 1}/${maxRetries + 1}):`, error.message);
            
            if (retryCount < maxRetries) {
                console.log(`🔄 Retrying connection in ${retryDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                return this.connect(retryCount + 1);
            }
            
            // Provide helpful error messages
            if (error.message.includes('Server selection timed out')) {
                console.log('💡 Troubleshooting tips:');
                console.log('   • Check your internet connection');
                console.log('   • Verify your MONGODB_URI in .env file');
                console.log('   • Ensure your MongoDB Atlas cluster is accessible');
                console.log('   • Check if your IP is whitelisted in MongoDB Atlas');
            }
            
            throw error;
        }
    }

    async createIndexes() {
        try {
            const Question = require('../models/Question');
            
            // Create compound indexes
            for (const index of databaseConfig.indexes.questions) {
                await Question.collection.createIndex(index);
            }
            
            console.log('✅ Database indexes created successfully');
        } catch (error) {
            console.warn('⚠️  Error creating indexes:', error.message);
        }
    }

    async disconnect() {
        if (this.connection) {
            await mongoose.disconnect();
            this.isConnected = false;
            console.log('✅ Disconnected from MongoDB Atlas');
        }
    }

    getConnection() {
        return this.connection;
    }

    isConnectedToDatabase() {
        return this.isConnected;
    }
}

// Singleton instance
const mongoConnection = new MongoConnection();

module.exports = mongoConnection; 