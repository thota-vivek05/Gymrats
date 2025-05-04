const mongoose = require('mongoose');

const nutritionPlanSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { 
        type: String,
        enum: ['Bulking', 'Cutting', 'Maintenance', 'Specialty'],
        required: true 
    },
    targetGoal: { type: String, required: true },
    description: { type: String, required: true },
    duration: { type: String, required: true },
    meals: { type: [Object], required: true },
    userCount: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    image: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('NutritionPlan', nutritionPlanSchema);