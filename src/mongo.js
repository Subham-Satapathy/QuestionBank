const mongoose = require('mongoose');
require('dotenv').config();

class MongoDBConnection {
    constructor() {
        this.isConnected = false;
        this.connection = null;
    }

    async connect() {
        if (this.isConnected) {
            return this.connection;
        }

        try {
            const mongoUri = process.env.MONGODB_URI;
            
            if (!mongoUri) {
                throw new Error('MONGODB_URI environment variable is not set. Please add your MongoDB Atlas connection string to .env file');
            }

            this.connection = await mongoose.connect(mongoUri, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });

            this.isConnected = true;
            console.log('✅ Connected to MongoDB Atlas');
            
            // Handle connection events
            mongoose.connection.on('error', (err) => {
                console.error('❌ MongoDB connection error:', err);
                this.isConnected = false;
            });

            mongoose.connection.on('disconnected', () => {
                console.log('⚠️  MongoDB disconnected');
                this.isConnected = false;
            });

            return this.connection;
        } catch (error) {
            console.error('❌ Failed to connect to MongoDB:', error.message);
            throw error;
        }
    }

    async disconnect() {
        if (this.isConnected && this.connection) {
            await mongoose.disconnect();
            this.isConnected = false;
            this.connection = null;
            console.log('✅ Disconnected from MongoDB Atlas');
        }
    }

    getConnection() {
        return this.connection;
    }

    isConnectedToDB() {
        return this.isConnected;
    }
}

// Create a singleton instance
const mongoConnection = new MongoDBConnection();

module.exports = mongoConnection; 