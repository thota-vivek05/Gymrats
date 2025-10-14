// models/UserExerciseRating.js
// OMEN

const mongoose = require('mongoose');

const userExerciseRatingSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  exerciseId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Exercise', 
    required: true 
  },
  rating: { 
    type: Number, 
    required: true,
    min: 1,
    max: 5
  },
  workoutType: {
    type: String,
    enum: ['Calisthenics', 'Weight Loss', 'HIIT', 'Competitive', 'Strength Training', 'Cardio', 'Flexibility', 'Bodybuilding'],
    required: true
  },
  effectiveness: {
    type: String,
    enum: ['Very Effective', 'Effective', 'Neutral', 'Ineffective', 'Very Ineffective'],
    default: 'Neutral'
  },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Compound index to ensure one rating per user per exercise
userExerciseRatingSchema.index({ userId: 1, exerciseId: 1 }, { unique: true });

// Update the updatedAt field before saving
userExerciseRatingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('UserExerciseRating', userExerciseRatingSchema);