// controllers/trainerController.js

const Trainer = require('../model/Trainer');
const User = require('../model/User');
const WorkoutPlan = require('../model/WorkoutPlan');
const NutritionPlan = require('../model/NutritionPlan');

// Trainer dashboard
exports.getDashboard = async (req, res) => {
    try {
        if (!req.session.trainer) {
            return res.redirect('/auth/trainer_login');
        }

        const trainerId = req.session.trainer._id;
        const trainer = await Trainer.findById(trainerId).populate('clients');
        
        if (!trainer) {
            return res.redirect('/auth/trainer_login');
        }

        res.render('trainer', {
            trainer,
            clients: trainer.clients
        });
    } catch (error) {
        console.error('Error fetching trainer dashboard:', error);
        res.redirect('/auth/trainer_login');
    }
};

// Trainer profile
exports.getProfile = async (req, res) => {
    try {
        if (!req.session.trainer) {
            return res.redirect('/auth/trainer_login');
        }

        const trainerId = req.session.trainer._id;
        const trainer = await Trainer.findById(trainerId);
        
        if (!trainer) {
            return res.redirect('/auth/trainer_login');
        }

        res.render('trainerprofile', {
            trainer
        });
    } catch (error) {
        console.error('Error fetching trainer profile:', error);
        res.redirect('/auth/trainer_login');
    }
};

// Trainer clients
exports.getClients = async (req, res) => {
    try {
        if (!req.session.trainer) {
            return res.redirect('/auth/trainer_login');
        }

        const trainerId = req.session.trainer._id;
        const trainer = await Trainer.findById(trainerId).populate('clients');
        
        if (!trainer) {
            return res.redirect('/auth/trainer_login');
        }

        res.render('trainer_clients', {
            trainer,
            clients: trainer.clients
        });
    } catch (error) {
        console.error('Error fetching trainer clients:', error);
        res.redirect('/auth/trainer_login');
    }
};

// Trainer workout plans
exports.getWorkoutPlans = async (req, res) => {
    try {
        if (!req.session.trainer) {
            return res.redirect('/auth/trainer_login');
        }

        const trainerId = req.session.trainer._id;
        const trainer = await Trainer.findById(trainerId).populate('workoutPlans');
        
        if (!trainer) {
            return res.redirect('/auth/trainer_login');
        }

        res.render('trainer_workout_plans', {
            trainer,
            workoutPlans: trainer.workoutPlans
        });
    } catch (error) {
        console.error('Error fetching trainer workout plans:', error);
        res.redirect('/auth/trainer_login');
    }
};

// Trainer nutrition plans
exports.getNutritionPlans = async (req, res) => {
    try {
        if (!req.session.trainer) {
            return res.redirect('/auth/trainer_login');
        }

        const trainerId = req.session.trainer._id;
        const trainer = await Trainer.findById(trainerId).populate('nutritionPlans');
        
        if (!trainer) {
            return res.redirect('/auth/trainer_login');
        }

        res.render('trainer_nutrition_plans', {
            trainer,
            nutritionPlans: trainer.nutritionPlans
        });
    } catch (error) {
        console.error('Error fetching trainer nutrition plans:', error);
        res.redirect('/auth/trainer_login');
    }
};

// Trainer appointments
exports.getAppointments = async (req, res) => {
    try {
        if (!req.session.trainer) {
            return res.redirect('/auth/trainer_login');
        }

        const trainerId = req.session.trainer._id;
        const trainer = await Trainer.findById(trainerId);
        
        if (!trainer) {
            return res.redirect('/auth/trainer_login');
        }

        res.render('trainer_appointments', {
            trainer,
            sessions: trainer.sessions
        });
    } catch (error) {
        console.error('Error fetching trainer appointments:', error);
        res.redirect('/auth/trainer_login');
    }
};

// Edit workout plan
exports.getWorkoutPlanEdit = async (req, res) => {
    try {
        if (!req.session.trainer) {
            return res.redirect('/auth/trainer_login');
        }

        const clientId = req.params.id;
        const client = await User.findById(clientId);
        
        if (!client) {
            return res.redirect('/trainer');
        }

        // Find existing workout plan for this client if any
        const existingPlan = await WorkoutPlan.findOne({ 
            client: clientId,
            trainer: req.session.trainer._id
        });

        res.render('workoutplanedit', {
            id: clientId,
            name: client.full_name,
            goal: client.fitnessGoal,
            workoutPlan: existingPlan ? existingPlan.exercises : null
        });
    } catch (error) {
        console.error('Error fetching workout plan edit page:', error);
        res.redirect('/trainer');
    }
};

// Edit nutrition plan
exports.getNutritionPlanEdit = async (req, res) => {
    try {
        if (!req.session.trainer) {
            return res.redirect('/auth/trainer_login');
        }

        const clientId = req.params.id;
        const client = await User.findById(clientId);
        
        if (!client) {
            return res.redirect('/trainer');
        }

        // Find existing nutrition plan for this client if any
        const existingPlan = await NutritionPlan.findOne({
            user_id: clientId,
            trainer: req.session.trainer._id
        });

        res.render('edit_nutritional_plan', {
            clientId,
            clientName: client.full_name,
            nutritionPlan: existingPlan
        });
    } catch (error) {
        console.error('Error fetching nutrition plan edit page:', error);
        res.redirect('/trainer');
    }
};