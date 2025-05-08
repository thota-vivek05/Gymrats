const mongoose = require('mongoose');

const verifierSchema = new mongoose.Schema({
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
    phone: { 
        type: String,
        match: [/^\+?[\d\s-]{10,}$/, 'Please enter a valid phone number']
    },
    password: {
        type: String,
        required: true
    },
    experienceYears: {
        type: Number,
        required: true,
        min: 1
    }
}, { timestamps: true });

module.exports = mongoose.model('Verifier', verifierSchema);