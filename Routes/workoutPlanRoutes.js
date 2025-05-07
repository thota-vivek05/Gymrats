// const express = require('express');
// const router = express.Router();
// const workoutPlanController = require('../controllers/workoutPlanController');

// // Trainer dashboard
// router.get('/trainer', isAuth, isTrainer, workoutPlanController.getTrainerDashboard);

// // Workout plan edit page
// router.get('/edit-workout-plan/:clientId', isAuth, isTrainer, workoutPlanController.getWorkoutPlanEdit);

// // Save workout plan (API endpoint)
// router.post('/api/save-workout-plan', isAuth, isTrainer, workoutPlanController.saveWorkoutPlan);

// // Get all workout plans (admin only)
// router.get('/api/workout-plans', isAuth, isTrainer, workoutPlanController.getAllWorkoutPlans);

// // Get workout plan by ID
// router.get('/api/workout-plans/:planId', isAuth, workoutPlanController.getWorkoutPlanById);

// // Delete workout plan
// router.delete('/api/workout-plans/:planId', isAuth, isTrainer, workoutPlanController.deleteWorkoutPlan);

// module.exports = router;