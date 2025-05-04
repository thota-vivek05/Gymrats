const mongoose = require('mongoose');

const trainerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    specialty: { type: String, required: true },
    experience: { type: String, required: true },
    clients: { type: Number, default: 0 },
    rating: { 
        type: Number,
        min: 0,
        max: 5,
        default: 0
    },
    status: { 
        type: String, 
        enum: ['Active', 'Inactive', 'Pending'],
        default: 'Active'
    },
    image: { type: String },
    email: { type: String },
    phone: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Trainer', trainerSchema);