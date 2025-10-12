// models/Exercise.js - UPDATED
// OMEN
const mongoose = require("mongoose");

const exerciseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ["Calisthenics", "Weight Loss", "HIIT", "Competitive", "Strength Training", "Cardio", "Flexibility", "Bodybuilding"],
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      required: true,
    },
    targetMuscles: { type: [String], required: true },
    instructions: { type: String, required: true },
    verified: { type: Boolean, default: false },
    image: { type: String },
    usageCount: { type: Number, default: 0 },
    type: {
      type: String,
      enum: ["Reps", "Time"],
      required: true,
    },
    defaultSets: { type: Number, default: 3 },
    defaultRepsOrDuration: { type: String, required: true },
    equipment: { type: [String], default: [] },
    // Rating fields
    averageRating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
    // Additional fields for better recommendations
    movementPattern: { type: String }, // e.g., "Push", "Pull", "Squat", "Hinge"
    primaryMuscle: { type: String },
    secondaryMuscles: { type: [String] }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Exercise", exerciseSchema);