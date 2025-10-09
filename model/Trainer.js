const mongoose = require('mongoose');

const trainerSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true,
        unique: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },
    password_hash: { 
        type: String, 
        required: true 
    },
    phone: { 
        type: String, 
        required: true,
        match: [/^\+?[\d\s-]{10,}$/, 'Please enter a valid phone number']
    },
    experience: { 
        type: String, 
        required: true,
        enum: ['1-2', '3-5', '5-10', '10+']
    },
    specializations: [{ 
        type: String, 
        enum: ['Weight Loss', 'Muscle Gain', 'Flexibility', 'Cardiovascular', 'Strength Training', 'Post-Rehab', 'Sports Performance', 'Nutrition']
    }],
    verifierId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Verifier',
        default: null 
    },
    clients: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }],
    sessions: [{
        clientId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User' 
        },
        date: { 
            type: Date, 
            required: true 
        },
        time: { 
            type: String, 
            required: true 
        },
        meetLink: { 
            type: String 
        }
    }],
    workoutPlans: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'WorkoutPlan' 
    }],
    nutritionPlans: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'NutritionPlan' 
    }],

    // NEW: Add this subscription object after your existing fields
    subscription: {
        type: { 
            type: String, 
            enum: ['Free', 'Basic', 'Pro', 'Enterprise'],
            default: 'Free'
        },
        months_remaining: { 
            type: Number, 
            default: 0,
            min: 0 
        },
        start_date: { 
            type: Date, 
            default: Date.now 
        },
        end_date: { 
            type: Date 
        },
        max_clients: { 
            type: Number, 
            default: 5 
        }
    },

    rating: { 
        type: Number,
        min: 0,
        max: 5,
        default: 0 
    },
    status: { 
        type: String, 
        enum: ['Active', 'Inactive', 'Suspended', 'Expired'],
        default: 'Active' 
    }
}, { timestamps: true });

module.exports = mongoose.model('Trainer', trainerSchema);