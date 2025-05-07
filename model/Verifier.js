const mongoose = require('mongoose');

const verifierSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    expertise: { 
        type: String, 
        required: true,
        enum: ['Strength Training', 'Cardiovascular Fitness', 'Nutrition', 'Yoga', 'Rehabilitation', 'Other']
    },
    contentReviewed: { 
        type: Number, 
        default: 0,
        min: 0 
    },
    accuracy: { 
        type: Number,
        min: 0,
        max: 100,
        default: 0 
    },
    joinDate: { 
        type: Date, 
        default: Date.now 
    },
    status: { 
        type: String,
        enum: ['Active', 'Inactive', 'Pending'],
        default: 'Pending'
    },
    image: { 
        type: String 
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
    assignedApplications: [{
        applicationId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'TrainerApplication' 
        },
        status: { 
            type: String, 
            enum: ['Pending', 'In Progress', 'Completed', 'Rejected'],
            default: 'Pending' 
        },
        assignedDate: { 
            type: Date, 
            default: Date.now 
        }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Verifier', verifierSchema);