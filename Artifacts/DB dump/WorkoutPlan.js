const mongoose = require('mongoose');

const workoutPlanSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { 
        type: String,
        enum: ['Strength', 'Cardio', 'HIIT', 'Flexibility', 'Balance'],
        required: true 
    },
    difficulty: { 
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced'],
        required: true 
    },
    duration: { type: String, required: true },
    description: { type: String, required: true },
    exercises: { type: [Object], required: true },
    userCount: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    image: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('WorkoutPlan', workoutPlanSchema);