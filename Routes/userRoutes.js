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
router.get('/userdashboard_p', isAuthenticated, userController.getUserDashboard);
router.post('/complete-workout', isAuthenticated, userController.completeWorkout);

module.exports = router;