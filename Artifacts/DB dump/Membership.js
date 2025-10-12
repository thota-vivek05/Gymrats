const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
    user_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true 
    },
    plan: { 
        type: String, 
        enum: ['basic', 'gold', 'platinum'], 
        required: true 
    },
    duration: { 
        type: Number, 
        enum: [1, 3, 6, 12], 
        required: true 
    },
    start_date: { 
        type: Date, 
        default: Date.now, 
        required: true 
    },
    end_date: { 
        type: Date, 
        required: true 
    },
    price: { 
        type: Number, 
        required: true 
    },
    payment_method: { 
        type: String, 
        enum: ['credit_card'], 
        required: true 
    },
    card_type: { 
        type: String, 
        enum: ['visa', 'mastercard', 'amex', null], 
        default: null 
    },
    card_last_four: { 
        type: String, 
        match: /^\d{4}$/, 
        default: null 
    },
    isPopular: { 
        type: Boolean, 
        default: function() {
            return this.plan === 'gold';
        } 
    },
    features: { 
        type: [String], 
        default: function() {
            switch (this.plan) {
                case 'basic':
                    return [
                        'Access to Exercise Guide',
                        'Basic Workout Plans',
                        'Nutritional Tips'
                    ];
                case 'gold':
                    return [
                        'Access to Exercise Guide',
                        'Advanced Workout Plans',
                        'Detailed Nutritional Guidance',
                        'Current Stats Tracking'
                    ];
                case 'platinum':
                    return [
                        'Access to Exercise Guide',
                        'Premium Workout Plans',
                        'Comprehensive Nutrition Guidance',
                        'Current Stats Tracking with Goals',
                        'Online Classes',
                        'Personal Training Sessions'
                    ];
                default:
                    return [];
            }
        } 
    },
    status: { 
        type: String, 
        enum: ['Active', 'Expired', 'Cancelled'], 
        default: 'Active' 
    }
}, { timestamps: true });

module.exports = mongoose.model('Membership', membershipSchema);