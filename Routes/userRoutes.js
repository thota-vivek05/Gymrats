const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    res.redirect('/login_signup?form=login');
};

router.get('/login_signup', (req, res) => {
    res.render('login_signup', { form: req.query.form || 'login' });
});

// Route for user dashboard with dynamic type (b, g, or p)
router.get('/userdashboard_:type', (req, res, next) => {
    const dashboardType = req.params.type; // Extract 'b', 'g', or 'p' from URL
    userController.getUserDashboard(req, res, dashboardType);
});

router.post('/login', userController.loginUser);
router.post('/signup', userController.signupUser);
router.get('/profile', userController.getUserProfile);
router.post('/complete-workout', userController.completeWorkout);
router.post('/api/workout/complete', userController.markWorkoutCompleted);

// For nutrition page
router.get('/user_nutrition', isAuthenticated, (req, res) => {
    res.render('user_nutrition', { 
        user: req.session.user,
        currentPage: 'nutrition'
    });
});

// For exercise page
router.get('/user_exercises', isAuthenticated, (req, res) => {
    res.render('user_exercises', { 
        user: req.session.user,
        currentPage: 'exercises'
    });
});

module.exports = router;