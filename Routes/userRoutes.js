const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController'); // Adjust path based on your project structure

// Render login/signup page
router.get('/login_signup', (req, res) => {
    res.render('login_signup', { form: req.query.form || 'login' });
});

// Login route
router.post('/login', userController.loginUser);

// Signup route
router.post('/signup', userController.signupUser);

module.exports = router;