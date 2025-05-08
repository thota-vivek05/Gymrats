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

router.post('/login', userController.loginUser);
router.post('/signup', userController.signupUser);

// Dashboard routes - make sure there are no duplicates
router.get('/userdashboard_p', isAuthenticated, (req, res) => {
    userController.getUserDashboard(req, res, 'p');
});

router.get('/userdashboard_b', isAuthenticated, (req, res) => {
    userController.getUserDashboard(req, res, 'b');
});

router.get('/userdashboard_g', isAuthenticated, (req, res) => {
    userController.getUserDashboard(req, res, 'g');
});

// Profile routes
router.get('/userprofile', isAuthenticated, userController.getUserProfile);
router.get('/userprofile/', isAuthenticated, userController.getUserProfile);

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