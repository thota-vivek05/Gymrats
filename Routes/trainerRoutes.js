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

// Render edit nutrition plan
router.get('/edit_nutritional_plan/:userId', trainerController.renderEditNutritionPlan);

// Save nutrition plan
router.post('/edit_nutritional_plan', trainerController.editNutritionPlan);

module.exports = router;