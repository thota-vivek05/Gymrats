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
    // brimstone
    workout_type: {
    type: String,
    enum: ['Calisthenics', 'Weight Loss', 'HIIT', 'Competitive', 'Strength Training', 'Cardio', 'Flexibility', 'Bodybuilding'],
    default: null
},

    // ✅ Added fields
    bodyFat: { 
        type: Number, 
        min: 0, 
        default: null 
    },
    goal: { 
        type: String, 
        default: null 
    },

    status: { 
        type: String, 
        enum: ['Active', 'Inactive', 'Suspended', 'Expired'],
        default: 'Active'
    },
    membershipType: { 
        type: String, 
        enum: ['Basic', 'Gold', 'Platinum'],
        default: 'Basic'
    },

  // NEW: Membership Duration Fields
    membershipDuration: {
        months_remaining: { 
            type: Number, 
            default: 0,
            min: 0 
        },
        start_date: { 
            type: Date, 
            default: Date.now 
        },
        end_date: { 
            type: Date 
        },
        auto_renew: { 
            type: Boolean, 
            default: false 
        },
        last_renewal_date: { 
            type: Date 
        }
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
        // Brimstone
        weight_goal: {
        type: Number,
        required: true,
        min: 20,
        max: 300
    },
    // Brimstone
    },

    trainer: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Trainer',
        default: null 
    },

    // New Fields for relations
    workout_history: [{ type: mongoose.Schema.Types.ObjectId, ref: 'WorkoutHistory' }],
    nutrition_history: [{ type: mongoose.Schema.Types.ObjectId, ref: 'NutritionHistory' }],




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
    }],

     // OMEN
    // Add to models/User.js (in the schema)
exercisePreferences: {
  preferredCategories: [{ type: String }],
  dislikedCategories: [{ type: String }],
  favoriteExercises: [{ 
    exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' },
    rating: { type: Number },
    addedAt: { type: Date, default: Date.now }
  }],
  lastRatedAt: { type: Date }
}


});

// REYNA
// Add these methods to your User.js schema (before module.exports)

// Add a method to check if membership is active
userSchema.methods.isMembershipActive = function() {
    return this.status === 'Active' && 
           this.membershipDuration.months_remaining > 0 &&
           (!this.membershipDuration.end_date || this.membershipDuration.end_date > new Date());
};

// Add a method to extend membership
userSchema.methods.extendMembership = function(additionalMonths) {
    this.membershipDuration.months_remaining += additionalMonths;
    this.membershipDuration.last_renewal_date = new Date();
    
    // Update end date
    const newEndDate = new Date();
    newEndDate.setMonth(newEndDate.getMonth() + this.membershipDuration.months_remaining);
    this.membershipDuration.end_date = newEndDate;
    
    this.status = 'Active';
    return this.save();
};

// Add a method to decrease membership by one month (for monthly cron job)
userSchema.methods.decreaseMembershipMonth = function() {
    if (this.membershipDuration.months_remaining > 0) {
        this.membershipDuration.months_remaining -= 1;
        
        if (this.membershipDuration.months_remaining === 0) {
            this.status = 'Expired';
        }
        return this.save();
    }
    return Promise.resolve(this);
};



module.exports = mongoose.model('User', userSchema);
// brimstone
// Add a method to extend membership
userSchema.methods.extendMembership = function(additionalMonths) {
    console.log('Before extension - months_remaining:', this.membershipDuration.months_remaining);
    console.log('Adding months:', additionalMonths);
    
    // ✅ FIX: Initialize months_remaining if it doesn't exist
    if (!this.membershipDuration.months_remaining) {
        this.membershipDuration.months_remaining = 0;
    }
    
    this.membershipDuration.months_remaining += additionalMonths;
    this.membershipDuration.last_renewal_date = new Date();
    
    // Update end date
    const newEndDate = new Date();
    newEndDate.setMonth(newEndDate.getMonth() + this.membershipDuration.months_remaining);
    this.membershipDuration.end_date = newEndDate;
    
    this.status = 'Active';
    
    console.log('After extension - months_remaining:', this.membershipDuration.months_remaining);
    console.log('New end date:', this.membershipDuration.end_date);
    
    return this.save();
};