const mongoose = require('mongoose');

const trainerApplicationSchema = new mongoose.Schema({
    firstName: { 
        type: String, 
        required: true 
    },
    lastName: { 
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
    status: { 
        type: String, 
        enum: ['Pending', 'In Progress', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    verifierId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Verifier',
        default: null 
    },
    verificationNotes: { 
        type: String 
    } // Notes from verifier
}, { timestamps: true });

module.exports = mongoose.model('TrainerApplication', trainerApplicationSchema);