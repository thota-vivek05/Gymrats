const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    full_name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password_hash: { type: String, required: true },
    dob: { type: String, required: true },
    gender: { type: String, required: true },
    phone: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
    weight_history: [{
        weight: { type: Number, required: true },
        date: { type: Date, default: Date.now }
    }],
    height: { type: Number, default: null },
    BMI: { type: Number, default: null },
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
        calorie_goal: { type: Number, default: 2200 },
        protein_goal: { type: Number, default: 90 },
        weight_goal: { type: Number, default: null }
    }
});

module.exports = mongoose.model('User', userSchema);