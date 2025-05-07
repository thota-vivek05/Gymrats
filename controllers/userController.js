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
exports.getProfile = async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.id) {
            return res.redirect('/auth/login_signup');
        }

        const userId = req.session.user.id;
        const user = await User.findById(userId);
        
        if (!user) {
            req.session.destroy();
            return res.redirect('/auth/login_signup');
        }

        // Get user's membership
        const membership = await Membership.findOne({ user_id: userId });
        if (!membership) {
            return res.status(400).send('Membership not found. Please contact support.');
        }

        return res.render('userprofile', {
            user,
            membership
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return res.status(500).render('error', { 
            message: 'Error loading profile. Please try again.'
        });
    }
};

// Get exercises page
// In userController.js
exports.getExercises = async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.id) {
            return res.redirect('/auth/login_signup');
        }

        const userId = req.session.user.id;
        const user = await User.findById(userId);
        
        if (!user) {
            req.session.destroy();
            return res.redirect('/auth/login_signup');
        }

        const membership = await Membership.findOne({ user_id: userId });
        if (!membership) {
            return res.status(400).send('Membership not found. Please contact support.');
        }

        // Fetch exercises from database
        const exercises = await Exercise.find({ verified: true });

        // Render the user_exercises template with user data
        return res.render('user_exercises', {
            user,
            membership,
            exercises
        });
    } catch (error) {
        console.error('Error fetching exercises:', error);
        return res.status(500).render('error', { 
            message: 'Error loading exercises. Please try again.'
        });
    }
};

// Get user's nutrition
exports.getNutrition = async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.id) {
            return res.redirect('/auth/login_signup');
        }

        const userId = req.session.user.id;
        const user = await User.findById(userId);
        
        if (!user) {
            req.session.destroy();
            return res.redirect('/auth/login_signup');
        }

        const membership = await Membership.findOne({ user_id: userId });
        if (!membership) {
            return res.status(400).send('Membership not found. Please contact support.');
        }

        const nutritionPlans = await NutritionPlan.find({ 
            verified: true, 
            membershipLevel: membership.plan.charAt(0).toUpperCase() + membership.plan.slice(1)
        });

        return res.render('user_nutrition', {
            user,
            nutritionPlans,
            membership
        });
    } catch (error) {
        console.error('Error fetching nutrition data:', error);
        return res.status(500).render('error', { 
            message: 'Error loading nutrition data. Please try again.'
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