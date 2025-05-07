const mongoose = require("mongoose");

const exerciseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ["Strength", "Cardio", "Flexibility", "Balance"],
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
    defaultRepsOrDuration: { type: String, required: true }, // e.g., "12 reps" or "30 seconds"
    equipment: { type: [String], default: [] }, // e.g., ["Dumbbell", "Bench"]
    workoutPlanLevel: {
      type: String,
      enum: ["Basic", "Intermediate", "Advanced"],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Exercise", exerciseSchema);
