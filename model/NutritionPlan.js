const mongoose = require('mongoose');

const nutritionPlanSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    type: { 
        type: String,
        enum: ['Bulking', 'Cutting', 'Maintenance', 'Specialty'],
        required: true 
    },
    targetGoal: { 
        type: String,
        enum: ['Weight Gain', 'Weight Loss', 'Maintenance', 'Health Improvement'],
        required: true 
    },
    description: { 
        type: String, 
        required: true 
    },
    duration: { 
        type: Number, // Duration in weeks
        required: true,
        min: 1 
    },
    user_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: false // Optional to allow generic plans
    },
    membershipLevel: { 
        type: String,
        enum: ['Basic', 'Gold', 'Platinum'],
        required: true 
    },
    dailyTargets: {
        calories: { type: Number, required: true }, // e.g., 2200
        protein: { type: Number, required: true }, // e.g., 90g
        carbs: { type: Number, required: true }, // e.g., 250g
        fats: { type: Number, required: true } // e.g., 70g
    },
    meals: [{
        mealName: { type: String, required: true }, // e.g., "Breakfast"
        time: { type: String, required: true }, // e.g., "8:00 AM"
        foods: [{
            name: { type: String, required: true }, // e.g., "Oatmeal"
            quantity: { type: String, required: true }, // e.g., "100g"
            calories: { type: Number, required: true }, // e.g., 150
            protein: { type: Number, required: true }, // e.g., 5
            carbs: { type: Number, required: true }, // e.g., 27
            fats: { type: Number, required: true } // e.g., 2
        }],
        totalCalories: { type: Number, required: true }, // Sum of food calories
        totalProtein: { type: Number, required: true },
        totalCarbs: { type: Number, required: true },
        totalFats: { type: Number, required: true }
    }],
    verified: { 
        type: Boolean, 
        default: false 
    },
    image: { 
        type: String // File path or URL, e.g., "/uploads/plan.jpg"
    }
}, { timestamps: true });

module.exports = mongoose.model('NutritionPlan', nutritionPlanSchema);