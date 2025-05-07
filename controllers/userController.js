// controllers/userController.js

const User = require('../model/User');
const Exercise = require('../model/Exercise');
const WorkoutPlan = require('../model/WorkoutPlan');
const NutritionPlan = require('../model/NutritionPlan');
const Trainer = require('../model/Trainer');
const Membership = require('../model/Membership');

// Get user dashboard based on membership level
exports.getDashboard = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/auth/login_signup');
        }

        const userId = req.session.user.id;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.redirect('/auth/login_signup');
        }

        // Find user's membership details
        const membership = await Membership.findOne({ user_id: userId });
        
        if (!membership) {
            return res.redirect('/auth/login_signup');
        }

        // Load appropriate dashboard based on membership level
        const dashboardTemplate = `userdashboard_${membership.plan.charAt(0)}`;

        // Get exercise progress data for the user
        const exercises = await Exercise.find({ verified: true }).limit(5);
        
        // Get workout plans for the user based on membership level
        const workoutPlans = await WorkoutPlan.find({ 
            verified: true, 
            difficulty: membership.plan === 'basic' ? 'Beginner' : 
                       membership.plan === 'gold' ? 'Intermediate' : 'Advanced'
        }).limit(3);

        // Get nutrition plans for the user
        const nutritionPlans = await NutritionPlan.find({ 
            verified: true, 
            membershipLevel: membership.plan.charAt(0).toUpperCase() + membership.plan.slice(1)
        }).limit(2);

        res.render(dashboardTemplate, {
            user,
            exercises,
            workoutPlans,
            nutritionPlans,
            membership
        });
    } catch (error) {
        console.error('Error fetching user dashboard:', error);
        res.redirect('/auth/login_signup');
    }
};

// Get user profile
exports.getProfile = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/auth/login_signup');
        }

        const userId = req.session.user.id;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.redirect('/auth/login_signup');
        }

        // Get user's membership
        const membership = await Membership.findOne({ user_id: userId });

        res.render('userprofile', {
            user,
            membership
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.redirect('/auth/login_signup');
    }
};

// Get user's workout history
exports.getWorkoutHistory = async (req, res) => {
    // Implementation for workout history
    res.send('Workout history route - To be implemented');
};

// Get user's nutrition plans
exports.getNutritionPlans = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/auth/login_signup');
        }

        const userId = req.session.user.id;
        const membership = await Membership.findOne({ user_id: userId });
        
        if (!membership) {
            return res.redirect('/auth/login_signup');
        }

        const nutritionPlans = await NutritionPlan.find({ 
            verified: true, 
            membershipLevel: membership.plan.charAt(0).toUpperCase() + membership.plan.slice(1)
        });

        res.render('nutrition_plans', {
            user: req.session.user,
            nutritionPlans
        });
    } catch (error) {
        console.error('Error fetching user nutrition plans:', error);
        res.redirect('/user/dashboard');
    }
};

// Get user's workout plans
exports.getWorkoutPlans = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/auth/login_signup');
        }

        const userId = req.session.user.id;
        const membership = await Membership.findOne({ user_id: userId });
        
        if (!membership) {
            return res.redirect('/auth/login_signup');
        }

        const workoutPlans = await WorkoutPlan.find({ 
            verified: true, 
            difficulty: membership.plan === 'basic' ? 'Beginner' : 
                       membership.plan === 'gold' ? 'Intermediate' : 'Advanced'
        });

        res.render('workout_plans', {
            user: req.session.user,
            workoutPlans
        });
    } catch (error) {
        console.error('Error fetching user workout plans:', error);
        res.redirect('/user/dashboard');
    }
};

// Get user's appointments
exports.getAppointments = async (req, res) => {
    // Implementation for appointments
    res.send('Appointments route - To be implemented');
};

// Get user settings
exports.getSettings = async (req, res) => {
    // Implementation for settings
    res.send('Settings route - To be implemented');
};