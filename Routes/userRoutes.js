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

// Add these routes to your userRoutes.js file
router.get('/user_exercises', isAuthenticated, (req, res) => {
    res.render('user_exercises', { 
      user: req.user,
      title: 'Exercise Guide'
    });
  });
  
  router.get('/user_nutrition', isAuthenticated, (req, res) => {
    res.render('user_nutrition', { 
      user: req.user,
      title: 'Nutrition Guide'
    });
  });
  
  // If you don't already have this route
  router.get('/userprofile', isAuthenticated, (req, res) => {
    res.render('userprofile', { 
      user: req.user,
      title: 'User Profile'
    });
  });

module.exports = router;