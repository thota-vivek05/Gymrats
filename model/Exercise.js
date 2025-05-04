const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { 
        type: String,
        enum: ['Strength', 'Cardio', 'Flexibility', 'Balance'],
        required: true
    },
    difficulty: { 
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced'],
        required: true
    },
    targetMuscles: { type: [String], required: true },
    instructions: { type: String, required: true },
    verified: { type: Boolean, default: false },
    image: { type: String },
    usageCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Exercise', exerciseSchema);