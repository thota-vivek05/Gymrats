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
        enum: ['male', 'female', 'other'], 
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
    weight_history: [{
        weight: { 
            type: Number, 
            required: true,
            min: 0 
        },
        date: { 
            type: Date, 
            default: Date.now 
        }
    }],
    height: { 
        type: Number, 
        min: 0,
        default: null 
    },
    BMI: { 
        type: Number, 
        min: 0,
        default: null 
    },
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
        weight_goal: { 
            type: Number, 
            min: 0,
            default: null 
        }
    },
    trainer: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Trainer',
        default: null 
    },
    workout_history: [{
        workoutPlanId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'WorkoutPlan' 
        },
        date: { 
            type: Date, 
            default: Date.now 
        },
        exercises: [{
            name: { 
                type: String, 
                required: true 
            },
            sets: { 
                type: Number, 
                min: 1 
            },
            reps: { 
                type: Number, 
                min: 1 
            },
            weight: { 
                type: Number, 
                min: 0 
            },
            duration: { 
                type: Number, 
                min: 0 
            }, // For timed exercises (e.g., 30 seconds)
            completed: { 
                type: Boolean, 
                default: false 
            }
        }],
        progress: { 
            type: Number, 
            min: 0, 
            max: 100 
        }, // Percentage completed
        completed: { 
            type: Boolean, 
            default: false 
        }
    }],
    nutrition_history: [{
        date: { 
            type: Date, 
            default: Date.now 
        },
        calories_consumed: { 
            type: Number, 
            min: 0 
        },
        protein_consumed: { 
            type: Number, 
            min: 0 
        },
        macros: {
            protein: { 
                type: Number, 
                min: 0 
            }, // Percentage
            carbs: { 
                type: Number, 
                min: 0 
            },
            fats: { 
                type: Number, 
                min: 0 
            }
        },
        foods: [{
            name: { 
                type: String, 
                required: true 
            },
            protein: { 
                type: Number, 
                min: 0 
            },
            calories: { 
                type: Number, 
                min: 0 
            }
        }]
    }],
    class_schedules: [{
        trainerId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Trainer' 
        },
        name: { 
            type: String, 
            required: true 
        }, // e.g., "HIIT Intensity"
        date: { 
            type: Date, 
            required: true 
        },
        time: { 
            type: String, 
            required: true 
        }, // e.g., "6:00 PM"
        meetLink: { 
            type: String 
        }, // e.g., "https://meet.google.com/abc-defg-hij"
        description: { 
            type: String 
        } // e.g., "High-intensity interval training..."
    }]
});

module.exports = mongoose.model('User', userSchema);