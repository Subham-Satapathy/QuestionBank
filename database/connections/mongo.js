const mongoose = require('mongoose');
const databaseConfig = require('../../config/database');

class MongoConnection {
    constructor() {
        this.isConnected = false;
        this.connection = null;
    }

    async connect() {
        if (this.isConnected) {
            console.log('✅ Already connected to MongoDB Atlas');
            return;
        }

        try {
            console.log('🔄 Connecting to MongoDB Atlas...');
            
            this.connection = await mongoose.connect(
                databaseConfig.mongodb.uri,
                databaseConfig.mongodb.options
            );

            this.isConnected = true;
            console.log('✅ Connected to MongoDB Atlas');

            // Set up connection event handlers
            mongoose.connection.on('error', (error) => {
                console.error('❌ MongoDB connection error:', error);
                this.isConnected = false;
            });

            mongoose.connection.on('disconnected', () => {
                console.log('⚠️  MongoDB disconnected');
                this.isConnected = false;
            });

            // Create indexes
            await this.createIndexes();

        } catch (error) {
            console.error('❌ Failed to connect to MongoDB Atlas:', error.message);
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