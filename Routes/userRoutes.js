// routes/userRoutes.js

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Login route (commented out because loginUser is not defined in userController.js)
// router.post('/login', userController.loginUser);

// Dashboard routes based on membership type
router.get('/dashboard', userController.getDashboard);
router.get('/profile', userController.getProfile);
router.get('/workout-history', userController.getWorkoutHistory);
router.get('/nutrition-plans', userController.getNutritionPlans);
router.get('/workout-plans', userController.getWorkoutPlans);
router.get('/appointments', userController.getAppointments);
router.get('/settings', userController.getSettings);

// Direct access to dashboard by membership level
router.get('/userdashboard_p', (req, res) => {
    if (!req.session.user || req.session.user.membershipPlan !== 'platinum') {
        return res.redirect('/auth/login_signup');
    }
    res.render('userdashboard_p', { user: req.session.user });
});

router.get('/userdashboard_g', (req, res) => {
    if (!req.session.user || req.session.user.membershipPlan !== 'gold') {
        return res.redirect('/auth/login_signup');
    }
    res.render('userdashboard_g', { user: req.session.user });
});

router.get('/userdashboard_b', (req, res) => {
    if (!req.session.user || req.session.user.membershipPlan !== 'basic') {
        return res.redirect('/auth/login_signup');
    }
    res.render('userdashboard_b', { user: req.session.user });
});

module.exports = router;