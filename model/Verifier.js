const mongoose = require('mongoose');

const verifierSchema = new mongoose.Schema({
    name: { type: String, required: true },
    expertise: { type: String, required: true },
    contentReviewed: { type: Number, default: 0 },
    accuracy: { 
        type: Number,
        min: 0,
        max: 100,
        default: 0 
    },
    joinDate: { type: Date, default: Date.now },
    status: { 
        type: String,
        enum: ['Active', 'Inactive', 'Pending'],
        default: 'Active'
    },
    image: { type: String },
    email: { type: String },
    phone: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Verifier', verifierSchema);