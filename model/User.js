const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    full_name: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        unique: true, 
        required: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },
    password_hash: { 
        type: String, 
        required: true 
    },
    dob: { 
        type: Date, 
        required: true 
    },
    gender: { 
        type: String, 
        enum: ['Male', 'Female', 'Other'], 
        required: true 
    },
    phone: { 
        type: String, 
        required: true,
        match: [/^\+?[\d\s-]{10,}$/, 'Please enter a valid phone number']
    },
    created_at: { 
        type: Date, 
        default: Date.now 
    },
    weight: { 
        type: Number, 
        required: true,
        min: 0 
    },
    height: { 
        type: Number, 
        min: 0,
        required: true
    },
    BMI: { 
        type: Number, 
        min: 0,
        default: null 
    },
    status: { 
        type: String, 
        enum: ['Active', 'Inactive', 'Suspended'],
        default: 'Active'
    },
    membershipType: { 
        type: String, 
        enum: ['Basic', 'Gold', 'Platinum'],
        default: 'Basic'
    },
    fitness_goals: {
        calorie_goal: { 
            type: Number, 
            default: 2200,
            min: 0 
        },
        protein_goal: { 
            type: Number, 
            default: 90,
            min: 0 
        },
        weight_goal: { 
            type: Number, 
            min: 0,
            default: null 
        }
    },
    trainer: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Trainer',
        default: null 
    },
    class_schedules: [{
        trainerId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Trainer' 
        },
        name: { 
            type: String, 
            required: true 
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
        },
        description: { 
            type: String 
        }
    }]
});

module.exports = mongoose.model('User', userSchema);