const express = require('express');
const router = express.Router();
const trainerController = require('../controllers/trainerController');

// Render trainer signup form
router.get('/trainer_form', (req, res) => {
    res.render('trainer_form');
});

// Handle trainer signup submission
router.post('/trainer-signup', trainerController.signupTrainer);

// Render trainer login form
router.get('/trainer_login', trainerController.renderTrainerLogin);

// Handle trainer login submission
router.post('/trainer/login', trainerController.loginTrainer);

// Render trainer dashboard
router.get('/trainer', trainerController.renderTrainerDashboard);

// Render edit workout plan
router.get('/edit_workout_plan/:userId', trainerController.renderEditWorkoutPlan);

// Save workout plan
router.post('/save-workout-plan', trainerController.saveWorkoutPlan);

// Fetch workout data
router.get('/workout/:userId', trainerController.getWorkoutData);

// Render edit nutrition plan
router.get('/edit_nutritional_plan/:userId', trainerController.renderEditNutritionPlan);

// Save nutrition plan
router.post('/edit_nutritional_plan', trainerController.editNutritionPlan);

// Fetch client data
router.get('/client/:id', trainerController.getClientData);

// Fetch nutrition data
router.get('/nutrition/:userId', trainerController.getNutritionData);

// Add this route to trainerRoutes.js
// BEFORE:
router.get('/exercise-ratings/:userId', trainerController.getClientExerciseRatings);

// AFTER:
router.get('/trainer/exercise-ratings/:userId', trainerController.getClientExerciseRatings);

// REYNA


// Render trainer assignment page
router.get('/trainer/assignment', trainerController.renderTrainerAssignment);

// Assign user to trainer
router.post('/trainer/assign-user', trainerController.assignUserToTrainer);

// Get unassigned users (API endpoint)
router.get('/trainer/unassigned-users', trainerController.getUnassignedUsers);

// END REYNA

module.exports = router;