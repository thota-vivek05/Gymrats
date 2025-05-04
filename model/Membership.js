const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
    user_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true 
    },
    plan: { type: String, required: true },
    duration: { type: Number, required: true },
    start_date: { type: Date, default: Date.now },
    end_date: { type: Date, required: true },
    price: { type: Number, required: true },
    payment_method: { type: String, required: true },
    card_type: { type: String },
    card_last_four: { type: String },
    isPopular: { type: Boolean, default: false },
    features: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Membership', membershipSchema);