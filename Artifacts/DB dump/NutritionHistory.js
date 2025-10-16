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
    calories_consumed: { 
        type: Number, 
        min: 0 
    },
    protein_consumed: { 
        type: Number, 
        min: 0 
    },
    macros: {
        protein: { 
            type: Number, 
            min: 0 
        },
        carbs: { 
            type: Number, 
            min: 0 
        },
        fats: { 
            type: Number, 
            min: 0 
        }
    },
    foods: [{
        name: { 
            type: String, 
            required: true 
        },
        protein: { 
            type: Number, 
            min: 0 
        },
        calories: { 
            type: Number, 
            min: 0 
        }
    }]
});

module.exports = mongoose.model('NutritionHistory', nutritionHistorySchema);