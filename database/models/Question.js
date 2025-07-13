const mongoose = require('mongoose');
const databaseConfig = require('../../config/database');

const questionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true,
        index: true,
        trim: true
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
        enum: databaseConfig.topics || ['javascript', 'typescript', 'nodejs', 'sql', 'react'],
        index: true
    },
    tags: [{
        type: String,
        index: true,
        trim: true
    }],
    example: {
        type: String,
        required: false,
        default: "No example provided",
        trim: true
    },
    options: [{
        type: String,
        required: true,
        trim: true
    }],
    answer: {
        type: String,
        required: true,
        trim: true
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
    timestamps: true, // Adds createdAt and updatedAt fields
    collection: databaseConfig.collections.questions
});

// Pre-save middleware to ensure hash is set
questionSchema.pre('save', function(next) {
    if (!this.hash) {
        const { generateQuestionHash } = require('../../utils/utils');
        this.hash = generateQuestionHash(this);
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

// Static method to get questions with pagination
questionSchema.statics.getQuestionsWithPagination = function(topic, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    return this.find({ topic })
        .sort({ savedAt: -1 })
        .skip(skip)
        .limit(limit);
};

// Static method to get total count by topic
questionSchema.statics.getCountByTopic = function(topic) {
    return this.countDocuments({ topic });
};

const Question = mongoose.model('Question', questionSchema);

module.exports = Question; 