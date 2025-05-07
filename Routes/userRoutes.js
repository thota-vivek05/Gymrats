const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Simple test route without middleware
router.get('/test', (req, res) => {
    res.send('User routes are working');
});
// Dashboard routes with authentication
router.get('/dashboard', userController.isAuthenticated, userController.redirectToDashboard);
router.get('/userdashboard_p', userController.isAuthenticated, userController.getPlatinumDashboard);
router.get('/userdashboard_g', userController.isAuthenticated, userController.getGoldDashboard);
router.get('/userdashboard_b', userController.isAuthenticated, userController.getBasicDashboard);
// Other user routes
router.get('/profile', userController.isAuthenticated, userController.getProfile);
router.get('/exercises', userController.isAuthenticated, userController.getExercises);
router.get('/nutrition', userController.isAuthenticated, userController.getNutrition);
router.get('/logout', userController.logout);
module.exports = router;