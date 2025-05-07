const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    full_name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password_hash: { type: String, required: true },
    dob: { type: String, required: true },
    gender: { type: String, required: true },
    phone: { type: String, required: true },
    profile_pic: { type: String, default: null },
    created_at: { type: Date, default: Date.now },
    weight: { type: Number, default: null },
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
    }
});

module.exports = mongoose.model('User', userSchema);