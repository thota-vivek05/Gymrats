// routes/authRoutes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Authentication routes
router.get('/login_signup', authController.getLoginSignup);
router.get('/trainer_login', authController.getTrainerLogin);
router.get('/trainer_form', authController.getTrainerForm);
router.get('/verifier_form', authController.getVerifierForm);
router.get('/logout', authController.logout);

module.exports = router;