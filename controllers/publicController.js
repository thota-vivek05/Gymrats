// controllers/publicController.js

const Exercise = require('../model/Exercise');
const NutritionPlan = require('../model/NutritionPlan');
const WorkoutPlan = require('../model/WorkoutPlan');
const Trainer = require('../model/Trainer');

// Home page
exports.getHome = async (req, res) => {
    try {
        const featuredTrainers = await Trainer.find({ verificationStatus: 'Approved' })
            .sort({ rating: -1 })
            .limit(4);

        const workoutPlans = await WorkoutPlan.find({ verified: true })
            .sort({ userCount: -1 })
            .limit(4);

        res.render('home', {
            user: req.session.user || null,
            featuredTrainers,
            workoutPlans
        });
    } catch (error) {
        console.error('Error loading home page:', error);
        res.render('home', {
            user: req.session.user || null,
            featuredTrainers: [],
            workoutPlans: []
        });
    }
};

// Exercise page (isolation.ejs)
exports.getExercises = async (req, res) => {
    try {
        const exercises = await Exercise.find({ verified: true });

        // Extract unique muscle groups for the sidebar
        const muscleGroups = [...new Set(exercises.flatMap(ex => ex.targetMuscles))];

        res.render('isolation', {
            user: req.session.user || null,
            exercises,
            muscleGroups
        });
    } catch (error) {
        console.error('Error loading exercises page:', error);
        res.render('isolation', {
            user: req.session.user || null,
            exercises: [],
            muscleGroups: []
        });
    }
};

// Nutrition page
exports.getNutrition = async (req, res) => {
    try {
        const nutritionPlans = await NutritionPlan.find({ verified: true });
        
        res.render('nutrition', {
            user: req.session.user || null,
            nutritionPlans
        });
    } catch (error) {
        console.error('Error loading nutrition page:', error);
        res.render('nutrition', {
            user: req.session.user || null,
            nutritionPlans: []
        });
    }
};

// Workout plans page
exports.getWorkoutPlans = async (req, res) => {
    try {
        const workoutPlans = await WorkoutPlan.find({ verified: true })
            .sort({ difficulty: 1 });

        // Group plans by difficulty level
        const basicPlans = workoutPlans.filter(plan => plan.difficulty === 'Beginner');
        const intermediatePlans = workoutPlans.filter(plan => plan.difficulty === 'Intermediate');
        const advancedPlans = workoutPlans.filter(plan => plan.difficulty === 'Advanced');

        res.render('workout_plans', {
            user: req.session.user || null,
            basicPlans,
            intermediatePlans,
            advancedPlans
        });
    } catch (error) {
        console.error('Error loading workout plans page:', error);
        res.render('workout_plans', {
            user: req.session.user || null,
            basicPlans: [],
            intermediatePlans: [],
            advancedPlans: []
        });
    }
};

// About page
exports.getAbout = (req, res) => {
    res.render('about', { user: req.session.user || null });
};

// Contact page
exports.getContact = (req, res) => {
    res.render('contact', { user: req.session.user || null });
};

// Blog page
exports.getBlog = (req, res) => {
    res.render('blog', { user: req.session.user || null });
};

// Calculators page
exports.getCalculators = (req, res) => {
    res.render('calculators', { user: req.session.user || null });
};

// Testimonials page
exports.getTestimonials = (req, res) => {
    res.render('testimonial', { user: req.session.user || null });
};

// Privacy policy page
exports.getPrivacyPolicy = (req, res) => {
    res.render('privacy_policy', { user: req.session.user || null });
};

// Terms page
exports.getTerms = (req, res) => {
    res.render('terms', { user: req.session.user || null });
};