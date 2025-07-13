const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    question: {
        type: String,
        required: true,
        index: true
    },
    difficulty: {
        type: String,
        required: true,
        enum: ['easy', 'medium', 'hard'],
        index: true
    },
    topic: {
        type: String,
        required: true,
        index: true
    },
    tags: [{
        type: String,
        index: true
    }],
    example: {
        type: String,
        required: false,
        default: "No example provided"
    },
    options: [{
        type: String,
        required: true
    }],
    answer: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    hash: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    savedAt: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true // Adds createdAt and updatedAt fields
});

// Create compound indexes for efficient querying
questionSchema.index({ topic: 1, difficulty: 1 });
questionSchema.index({ topic: 1, tags: 1 });
questionSchema.index({ difficulty: 1, tags: 1 });

// Add text index for search functionality
questionSchema.index({ 
    question: 'text', 
    example: 'text' 
});

// Pre-save middleware to ensure hash is set
questionSchema.pre('save', function(next) {
    if (!this.hash) {
        const { generateHash } = require('../utils');
        this.hash = generateHash(this.question + this.topic);
    }
    next();
});

// Static method to find questions by topic
questionSchema.statics.findByTopic = function(topic) {
    return this.find({ topic }).sort({ savedAt: -1 });
};

// Static method to find questions by difficulty
questionSchema.statics.findByDifficulty = function(difficulty) {
    return this.find({ difficulty }).sort({ savedAt: -1 });
};

// Static method to find questions by topic and difficulty
questionSchema.statics.findByTopicAndDifficulty = function(topic, difficulty) {
    return this.find({ topic, difficulty }).sort({ savedAt: -1 });
};

// Static method to search questions by text
questionSchema.statics.searchQuestions = function(searchText) {
    return this.find(
        { $text: { $search: searchText } },
        { score: { $meta: "textScore" } }
    ).sort({ score: { $meta: "textScore" } });
};

// Static method to get statistics
questionSchema.statics.getStats = function() {
    return this.aggregate([
        {
            $group: {
                _id: '$topic',
                count: { $sum: 1 },
                difficulties: {
                    $push: '$difficulty'
                }
            }
        },
        {
            $project: {
                topic: '$_id',
                total: '$count',
                easy: {
                    $size: {
                        $filter: {
                            input: '$difficulties',
                            cond: { $eq: ['$$this', 'easy'] }
                        }
                    }
                },
                medium: {
                    $size: {
                        $filter: {
                            input: '$difficulties',
                            cond: { $eq: ['$$this', 'medium'] }
                        }
                    }
                },
                hard: {
                    $size: {
                        $filter: {
                            input: '$difficulties',
                            cond: { $eq: ['$$this', 'hard'] }
                        }
                    }
                }
            }
        }
    ]);
};

const Question = mongoose.model('Question', questionSchema);

module.exports = Question; 