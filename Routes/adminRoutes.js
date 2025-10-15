// Import dependencies
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Dashboard Route
router.get('/dashboard', adminController.getDashboard);
router.get('/', (req, res) => res.redirect('/admin/dashboard'));

// User Routes
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Trainer Routes
router.get('/trainers', adminController.getTrainers);
router.get('/api/trainers', adminController.getTrainersApi); // New API endpoint for dynamic fetching
router.post('/trainers', adminController.createTrainer);
router.put('/trainers/:id', adminController.updateTrainer);
router.delete('/trainers/:id', adminController.deleteTrainer);

// Membership Routes
router.get('/memberships', adminController.getMemberships);
router.post('/memberships', adminController.createMembership);
router.put('/memberships/:id', adminController.updateMembership);
router.delete('/memberships/:id', adminController.deleteMembership);

// Nutrition Plan Routes
router.get('/nutrition-plans', adminController.getNutritionPlans);
router.post('/nutrition-plans', adminController.createNutritionPlan);
router.put('/nutrition-plans/:id', adminController.updateNutritionPlan);
router.delete('/nutrition-plans/:id', adminController.deleteNutritionPlan);

// Exercise Routes
router.get('/exercises', adminController.getExercises);
router.post('/exercises', adminController.createExercise);
router.put('/exercises/:id', adminController.updateExercise);
router.delete('/exercises/:id', adminController.deleteExercise);

// Workout Plan Routes
router.get('/workout-plans', adminController.getWorkoutPlans);
router.post('/workout-plans', adminController.createWorkoutPlan);
router.put('/workout-plans/:id', adminController.updateWorkoutPlan);
router.delete('/workout-plans/:id', adminController.deleteWorkoutPlan);

// Verifier Routes
router.get('/verifier', adminController.getVerifiers);
router.post('/verifier', adminController.createVerifier);
router.put('/verifier/:id', adminController.updateVerifier);
router.delete('/verifier/:id', adminController.deleteVerifier);

// Settings Routes
router.get('/settings', adminController.getSettings);
router.post('/settings', adminController.updateSettings);

module.exports = router;