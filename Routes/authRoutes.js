// routes/authRoutes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// routes/authRoutes.js

// Authentication page routes
router.get('/login_signup', authController.getLoginSignup);
router.get('/trainer_login', authController.getTrainerLogin);
router.get('/trainer_form', authController.getTrainerForm);
router.get('/verifier_form', authController.getVerifierForm);
router.get('/logout', authController.logout);

// Authentication API routes
router.post('/login', authController.login);
router.post('/signup', authController.signup);
router.post('/trainer-login', authController.trainerLogin);

module.exports = router;