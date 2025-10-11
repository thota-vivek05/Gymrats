const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// REYNA
const membershipController = require('../controllers/membershipController'); // ADD THIS


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
// added checkactivemembership (for months left)              REYNA
router.get('/userdashboard_:type', userController.checkMembershipActive, (req, res, next) => {
    const dashboardType = req.params.type; // Extract 'b', 'g', or 'p' from URL
    userController.getUserDashboard(req, res, dashboardType);
});

router.post('/login', userController.loginUser);
router.post('/signup', userController.signupUser);
router.get('/profile', userController.getUserProfile);
router.post('/complete-workout', userController.completeWorkout);
router.post('/api/workout/complete', userController.markWorkoutCompleted);

// Membership management routes
router.post('/membership/extend', membershipController.extendMembership);
router.get('/membership/status', membershipController.getMembershipStatus);
router.post('/membership/auto-renew', membershipController.toggleAutoRenew);
//brimstone
router.post('/user/membership/change', isAuthenticated, userController.changeMembership);
//brimstone
router.get('/membership_renewal', isAuthenticated, (req, res) => {
    res.render('membership_renewal', { 
        user: req.session.user 
    });
});

// For nutrition page
router.get('/user_nutrition', userController.checkMembershipActive, isAuthenticated, (req, res) => {
    res.render('user_nutrition', { 
        user: req.session.user,
        currentPage: 'nutrition'
    });
});

// For exercise page
router.get('/user_exercises', userController.checkMembershipActive, isAuthenticated, (req, res) => {
    res.render('user_exercises', { 
        user: req.session.user,
        currentPage: 'exercises'
    });
});
// Add this route to userRoutes.js
router.put('/user/profile/update', isAuthenticated, userController.updateUserProfile);

module.exports = router;
