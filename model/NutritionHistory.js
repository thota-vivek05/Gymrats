const mongoose = require('mongoose');

const nutritionHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: { 
        type: Date, 
        default: Date.now 
    },
    // Weekly goals
    protein_goal: { type: Number, min: 0 },
    calorie_goal: { type: Number, min: 0 },
    
    // ✅ NEW: Daily nutrition with macros for the entire week
    daily_nutrition: {
        Monday: {
            calories_consumed: { type: Number, min: 0, default: 0 },
            protein_consumed: { type: Number, min: 0, default: 0 },
            foods: [{
                name: { type: String },
                protein: { type: Number, min: 0 },
                calories: { type: Number, min: 0 },
                carbs: { type: Number, min: 0 },
                fats: { type: Number, min: 0 },
                consumed: { type: Boolean, default: false }, // Track if food is eaten
                consumedAt: { type: Date } // Timestamp when marked as eaten
            }],
            macros: {
                protein: { type: Number, min: 0, default: 0 },
                carbs: { type: Number, min: 0, default: 0 },
                fats: { type: Number, min: 0, default: 0 }
            }
        },
        Tuesday: {
            calories_consumed: { type: Number, min: 0, default: 0 },
            protein_consumed: { type: Number, min: 0, default: 0 },
            foods: [{
                name: { type: String },
                protein: { type: Number, min: 0 },
                calories: { type: Number, min: 0 },
                carbs: { type: Number, min: 0 },
                fats: { type: Number, min: 0 },
                consumed: { type: Boolean, default: false }, // Track if food is eaten
                consumedAt: { type: Date } // Timestamp when marked as eaten
            }],
            macros: {
                protein: { type: Number, min: 0, default: 0 },
                carbs: { type: Number, min: 0, default: 0 },
                fats: { type: Number, min: 0, default: 0 }
            }
        },
        Wednesday: {
            calories_consumed: { type: Number, min: 0, default: 0 },
            protein_consumed: { type: Number, min: 0, default: 0 },
            foods: [{
                name: { type: String },
                protein: { type: Number, min: 0 },
                calories: { type: Number, min: 0 },
                carbs: { type: Number, min: 0 },
                fats: { type: Number, min: 0 },
                consumed: { type: Boolean, default: false }, // Track if food is eaten
                consumedAt: { type: Date } // Timestamp when marked as eaten
            }],
            macros: {
                protein: { type: Number, min: 0, default: 0 },
                carbs: { type: Number, min: 0, default: 0 },
                fats: { type: Number, min: 0, default: 0 }
            }
        },
        Thursday: {
            calories_consumed: { type: Number, min: 0, default: 0 },
            protein_consumed: { type: Number, min: 0, default: 0 },
            foods: [{
                name: { type: String },
                protein: { type: Number, min: 0 },
                calories: { type: Number, min: 0 },
                carbs: { type: Number, min: 0 },
                fats: { type: Number, min: 0 },
                consumed: { type: Boolean, default: false }, // Track if food is eaten
                consumedAt: { type: Date } // Timestamp when marked as eaten
            }],
            macros: {
                protein: { type: Number, min: 0, default: 0 },
                carbs: { type: Number, min: 0, default: 0 },
                fats: { type: Number, min: 0, default: 0 }
            }
        },
        Friday: {
            calories_consumed: { type: Number, min: 0, default: 0 },
            protein_consumed: { type: Number, min: 0, default: 0 },
            foods: [{
                name: { type: String },
                protein: { type: Number, min: 0 },
                calories: { type: Number, min: 0 },
                carbs: { type: Number, min: 0 },
                fats: { type: Number, min: 0 },
                consumed: { type: Boolean, default: false }, // Track if food is eaten
                consumedAt: { type: Date } // Timestamp when marked as eaten
            }],
            macros: {
                protein: { type: Number, min: 0, default: 0 },
                carbs: { type: Number, min: 0, default: 0 },
                fats: { type: Number, min: 0, default: 0 }
            }
        },
        Saturday: {
            calories_consumed: { type: Number, min: 0, default: 0 },
            protein_consumed: { type: Number, min: 0, default: 0 },
            foods: [{
                name: { type: String },
                protein: { type: Number, min: 0 },
                calories: { type: Number, min: 0 },
                carbs: { type: Number, min: 0 },
                fats: { type: Number, min: 0 },
                consumed: { type: Boolean, default: false }, // Track if food is eaten
                consumedAt: { type: Date } // Timestamp when marked as eaten
            }],
            macros: {
                protein: { type: Number, min: 0, default: 0 },
                carbs: { type: Number, min: 0, default: 0 },
                fats: { type: Number, min: 0, default: 0 }
            }
        },
        Sunday: {
            calories_consumed: { type: Number, min: 0, default: 0 },
            protein_consumed: { type: Number, min: 0, default: 0 },
            foods: [{
                name: { type: String },
                protein: { type: Number, min: 0 },
                calories: { type: Number, min: 0 },
                carbs: { type: Number, min: 0 },
                fats: { type: Number, min: 0 },
                consumed: { type: Boolean, default: false }, // Track if food is eaten
                consumedAt: { type: Date } // Timestamp when marked as eaten
            }],
            macros: {
                protein: { type: Number, min: 0, default: 0 },
                carbs: { type: Number, min: 0, default: 0 },
                fats: { type: Number, min: 0, default: 0 }
            }
        }
    },
    
    // Weekly average macros
    weekly_macros: {
        protein: { type: Number, min: 0 },
        carbs: { type: Number, min: 0 },
        fats: { type: Number, min: 0 }
    }
});

module.exports = mongoose.model('NutritionHistory', nutritionHistorySchema);