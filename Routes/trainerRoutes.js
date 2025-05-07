// routes/trainerRoutes.js

const express = require('express');
const router = express.Router();
const trainerController = require('../controllers/trainerController');

// Trainer related routes
router.get('/', trainerController.getDashboard);
router.get('/profile', trainerController.getProfile);
router.get('/clients', trainerController.getClients);
router.get('/workout-plans', trainerController.getWorkoutPlans);
router.get('/nutrition-plans', trainerController.getNutritionPlans);
router.get('/appointments', trainerController.getAppointments);
router.get('/workoutplanedit/:id', trainerController.getWorkoutPlanEdit);
router.get('/edit-nutritional-plan/:id', trainerController.getNutritionPlanEdit);

module.exports = router;