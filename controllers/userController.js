// controllers/userController.js - Fully updated version

const User = require('../model/User');
const Exercise = require('../model/Exercise');
const WorkoutPlan = require('../model/WorkoutPlan');
const NutritionPlan = require('../model/NutritionPlan');
const Trainer = require('../model/Trainer');
const Membership = require('../model/Membership');

// Middleware to check if user is authenticated
exports.isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    return res.redirect('/auth/login_signup');
};

// Redirect to appropriate dashboard based on membership
exports.redirectToDashboard = async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.id) {
            return res.redirect('/auth/login_signup');
        }
        
        const userId = req.session.user.id;
        let membership;
        
        try {
            membership = await Membership.findOne({ user_id: userId });
        } catch (err) {
            console.error('Error finding membership:', err);
            return res.redirect('/auth/login_signup');
        }
        
        if (!membership) {
            return res.status(400).send('Membership not found. Please contact support.');
        }
        
        // Redirect to appropriate dashboard based on membership
       // Redirect to appropriate dashboard based on membership
switch(membership.plan.toLowerCase()) {
    case 'platinum':
        return res.redirect('/userdashboard_p');
    case 'gold':
        return res.redirect('/userdashboard_g');
    case 'basic':
        return res.redirect('/userdashboard_b');
    default:
        return res.redirect('/userdashboard_b');
}
    } catch (error) {
        console.error('Dashboard redirect error:', error);
        return res.status(500).render('error', { 
            message: 'Error redirecting to dashboard. Please try again.'
        });
    }
};

// Platinum dashboard
exports.getPlatinumDashboard = async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.id) {
            return res.redirect('/auth/login_signup');
        }

        const userId = req.session.user.id;
        let user;
        
        try {
            user = await User.findById(userId);
        } catch (err) {
            console.error('Error finding user:', err);
            req.session.destroy();
            return res.redirect('/auth/login_signup');
        }
        
        if (!user) {
            req.session.destroy();
            return res.redirect('/auth/login_signup');
        }

        // Get user's membership
        let membership;
        try {
            membership = await Membership.findOne({ user_id: userId });
        } catch (err) {
            console.error('Error finding membership:', err);
        }
        
        if (!membership) {
            return res.status(400).send('Membership not found. Please contact support.');
        }
        
        // Security check to ensure platinum users access platinum dashboard
        if (membership.plan.toLowerCase() !== 'platinum') {
            return res.redirect('/user/dashboard');
        }

        // Stats for the dashboard
        const stats = {
            calories: { current: 1850, goal: 2200 },
            workouts: { completed: 4, goal: 5 },
            protein: { current: 85, goal: 90 },
            weight: 75
        };

        // Get exercise data
        let exercises = [];
        try {
            exercises = await Exercise.find({ verified: true }).limit(5);
        } catch (err) {
            console.error('Error finding exercises:', err);
        }

        // Get workout plans
        let workoutPlans = [];
        try {
            workoutPlans = await WorkoutPlan.find({ 
                verified: true, 
                difficulty: 'Advanced'
            }).limit(3);
        } catch (err) {
            console.error('Error finding workout plans:', err);
        }

        // Get nutrition plans
        let nutritionPlans = [];
        try {
            nutritionPlans = await NutritionPlan.find({ 
                verified: true, 
                membershipLevel: 'Platinum'
            }).limit(2);
        } catch (err) {
            console.error('Error finding nutrition plans:', err);
        }

        return res.render('userdashboard_p', {
            user,
            exercises,
            workoutPlans,
            nutritionPlans,
            membership,
            stats
        });
    } catch (error) {
        console.error('Error in platinum dashboard:', error);
        return res.status(500).render('error', { 
            message: 'Error loading dashboard. Please try again.'
        });
    }
};

// Gold dashboard
exports.getGoldDashboard = async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.id) {
            return res.redirect('/auth/login_signup');
        }

        const userId = req.session.user.id;
        let user;
        
        try {
            user = await User.findById(userId);
        } catch (err) {
            console.error('Error finding user:', err);
            req.session.destroy();
            return res.redirect('/auth/login_signup');
        }
        
        if (!user) {
            req.session.destroy();
            return res.redirect('/auth/login_signup');
        }

        // Get user's membership
        let membership;
        try {
            membership = await Membership.findOne({ user_id: userId });
        } catch (err) {
            console.error('Error finding membership:', err);
        }
        
        if (!membership) {
            return res.status(400).send('Membership not found. Please contact support.');
        }
        
        // Security check to ensure gold users access gold dashboard
        if (membership.plan.toLowerCase() !== 'gold') {
            return res.redirect('/user/dashboard');
        }

        // Stats for the dashboard
        const stats = {
            calories: { current: 1850, goal: 2200 },
            workouts: { completed: 4, goal: 5 },
            protein: { current: 85, goal: 90 },
            weight: 75
        };

        // Get exercise data
        let exercises = [];
        try {
            exercises = await Exercise.find({ verified: true }).limit(5);
        } catch (err) {
            console.error('Error finding exercises:', err);
        }

        // Get workout plans
        let workoutPlans = [];
        try {
            workoutPlans = await WorkoutPlan.find({ 
                verified: true, 
                difficulty: 'Intermediate'
            }).limit(3);
        } catch (err) {
            console.error('Error finding workout plans:', err);
        }

        // Get nutrition plans
        let nutritionPlans = [];
        try {
            nutritionPlans = await NutritionPlan.find({ 
                verified: true, 
                membershipLevel: 'Gold'
            }).limit(2);
        } catch (err) {
            console.error('Error finding nutrition plans:', err);
        }

        return res.render('userdashboard_g', {
            user,
            exercises,
            workoutPlans,
            nutritionPlans,
            membership,
            stats
        });
    } catch (error) {
        console.error('Error in gold dashboard:', error);
        return res.status(500).render('error', { 
            message: 'Error loading dashboard. Please try again.'
        });
    }
};

// Basic dashboard
exports.getBasicDashboard = async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.id) {
            return res.redirect('/auth/login_signup');
        }

        const userId = req.session.user.id;
        let user;
        
        try {
            user = await User.findById(userId);
        } catch (err) {
            console.error('Error finding user:', err);
            req.session.destroy();
            return res.redirect('/auth/login_signup');
        }
        
        if (!user) {
            req.session.destroy();
            return res.redirect('/auth/login_signup');
        }

        // Get user's membership
        let membership;
        try {
            membership = await Membership.findOne({ user_id: userId });
        } catch (err) {
            console.error('Error finding membership:', err);
        }
        
        if (!membership) {
            return res.status(400).send('Membership not found. Please contact support.');
        }
        
        // Security check to ensure basic users access basic dashboard
        if (membership.plan.toLowerCase() !== 'basic') {
            return res.redirect('/user/dashboard');
        }

        // Stats for the dashboard
        const stats = {
            calories: { current: 1850, goal: 2200 },
            workouts: { completed: 4, goal: 5 },
            protein: { current: 85, goal: 90 },
            weight: 75
        };

        // Get exercise data
        let exercises = [];
        try {
            exercises = await Exercise.find({ verified: true }).limit(5);
        } catch (err) {
            console.error('Error finding exercises:', err);
        }

        // Get workout plans
        let workoutPlans = [];
        try {
            workoutPlans = await WorkoutPlan.find({ 
                verified: true, 
                difficulty: 'Beginner'
            }).limit(3);
        } catch (err) {
            console.error('Error finding workout plans:', err);
        }

        // Get nutrition plans
        let nutritionPlans = [];
        try {
            nutritionPlans = await NutritionPlan.find({ 
                verified: true, 
                membershipLevel: 'Basic'
            }).limit(2);
        } catch (err) {
            console.error('Error finding nutrition plans:', err);
        }

        return res.render('userdashboard_b', {
            user,
            exercises,
            workoutPlans,
            nutritionPlans,
            membership,
            stats
        });
    } catch (error) {
        console.error('Error in basic dashboard:', error);
        return res.status(500).render('error', { 
            message: 'Error loading dashboard. Please try again.'
        });
    }
};

// Get user profile
// Add to controllers/userController.js
exports.getProfile = async (req, res) => {
    try {
        // Check if user is logged in
        if (!req.session || !req.session.user || !req.session.user.id) {
            console.log("No valid session found - redirecting to login");
            return res.redirect('/auth/login_signup');
        }

        const userId = req.session.user.id;
        console.log("User ID from session:", userId);
        
        // Get complete user data from database
        let user = await User.findById(userId);
        
        if (!user) {
            console.log("User not found in database - destroying session");
            req.session.destroy();
            return res.redirect('/auth/login_signup');
        }
        
        console.log("User data from database:", user);
        
        // Format user data for display
        const formattedUser = {
            _id: user._id,
            full_name: user.full_name || user.name,
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            gender: user.gender || '',
            height: user.height || '',
            weight: user.weight || '',
            age: calculateAge(user.dob), // Calculate age from DOB
            BMI: user.BMI || '',
            bodyFat: '', // Not present in current data
            status: user.status || 'Active',
            membershipType: user.membershipType || 'Basic',
            created_at: user.created_at || new Date(),
            fitness_goals: user.fitness_goals || {},
            workout_history: user.workout_history || [],
            membershipFeatures: getMembershipFeatures(user.membershipType)
        };
        
        // Log formatted user data
        console.log("Formatted user data:", {
            _id: formattedUser._id,
            name: formattedUser.name,
            email: formattedUser.email,
            membershipType: formattedUser.membershipType
        });
        
        // Render the profile template with user data
        return res.render('userprofile', {
            user: formattedUser
        });
    } catch (error) {
        console.error("Error in getProfile:", error);
        return res.status(500).render('error', { 
            message: 'Error loading profile. Please try again.'
        });
    }
};

// Helper function to calculate age from date of birth
function calculateAge(dob) {
    if (!dob) return '';
    
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}

// Helper function to get features based on membership type
function getMembershipFeatures(membershipType) {
    const features = {
        'Basic': [
            'Access to basic workout plans',
            'Exercise library access',
            'Progress tracking',
            'Community forum access'
        ],
        'Gold': [
            'All Basic features',
            'Personalized workout recommendations',
            'Nutrition advice',
            'Weekly progress reports'
        ],
        'Platinum': [
            'All Gold features',
            'One-on-one trainer consultations',
            'Custom meal plans',
            'Advanced analytics and insights',
            'Priority support'
        ]
    };
    
    return features[membershipType] || features['Basic'];
}

// controllers/userController.js - getExercises method
// controllers/userController.js - getExercises method
// controllers/userController.js - getExercises method (complete implementation)
exports.getExercises = async (req, res) => {
    try {
        // Check if user is logged in
        if (!req.session || !req.session.user || !req.session.user.id) {
            console.log("No valid session found - redirecting to login");
            return res.redirect('/auth/login_signup');
        }

        const userId = req.session.user.id;
        console.log("User ID from session:", userId);
        
        // Get user data from database
        let user = await User.findById(userId);
        
        if (!user) {
            console.log("User not found in database - destroying session");
            req.session.destroy();
            return res.redirect('/auth/login_signup');
        }
        
        console.log("User data:", {
            id: user._id,
            name: user.full_name || 'Name not available'
        });
        
        // Get membership data
        let membership = await Membership.findOne({ user_id: userId });
        
        if (!membership) {
            console.log("No membership found for user");
            return res.status(400).send('Membership not found. Please contact support.');
        }
        
        console.log("Membership data:", {
            plan: membership.plan
        });
        
        // Get list of exercises for the page
        const categories = [
            { id: 'chest', name: 'Chest' },
            { id: 'back', name: 'Back' },
            { id: 'legs', name: 'Legs' },
            { id: 'shoulders', name: 'Shoulders' },
            { id: 'arms', name: 'Arms' },
            { id: 'abs', name: 'Abs' }
        ];
        
        // Add name to user object for debugging
        console.log(`User full_name before render: ${user.full_name}`);
        
        // Manually ensure user has full_name property for testing
        if (!user.full_name) {
            console.log("Adding test name to user");
            user.full_name = "Test User";
        }
        
        // Render template with data
        return res.render('user_exercises', {
            user: user,
            membership: membership,
            categories: categories
        });
    } catch (error) {
        console.error("Error in getExercises:", error);
        return res.status(500).render('error', { 
            message: 'Error loading exercises. Please try again.'
        });
    }
};

// Get user's nutrition
// Add to controllers/userController.js
// controllers/userController.js - getNutrition method
exports.getNutrition = async (req, res) => {
    try {
        // Check if user is logged in
        if (!req.session || !req.session.user || !req.session.user.id) {
            console.log("No valid session found - redirecting to login");
            return res.redirect('/auth/login_signup');
        }

        const userId = req.session.user.id;
        console.log("User ID from session:", userId);
        
        // Get user data from database
        let user = await User.findById(userId);
        
        if (!user) {
            console.log("User not found in database - destroying session");
            req.session.destroy();
            return res.redirect('/auth/login_signup');
        }
        
        console.log("User data from database:", user);
        
        // Get membership data and attach to user object
        try {
            let membership = await Membership.findOne({ user_id: userId });
            
            if (membership) {
                user.membership = membership.plan;
                console.log("Added membership to user:", user.membership);
            } else {
                // Default to basic if no membership found
                user.membership = "Basic";
                console.log("No membership found, using default:", user.membership);
            }
        } catch (membershipErr) {
            console.error("Error finding membership:", membershipErr);
            // Set a default membership if there's an error
            user.membership = "Basic";
        }
        
        // Log what we're sending to the template
        console.log("Data being sent to template:", {
            user: {
                id: user._id,
                name: user.name,
                membership: user.membership
            }
        });
        
        // Render template with user data that includes membership
        return res.render('user_nutrition', {
            user: user
        });
    } catch (error) {
        console.error("Error in getNutrition:", error);
        return res.status(500).render('error', { 
            message: 'Error loading nutrition page. Please try again.'
        });
    }
};

// Logout functionality
exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Error logging out');
        }
        return res.redirect('/auth/login_signup');
    });
};