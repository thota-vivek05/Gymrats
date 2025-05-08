const express = require('express');
const router = express.Router();
const trainerController = require('../controllers/trainerController');

// Render trainer signup form
router.get('/trainer_form', (req, res) => {
    res.render('trainer_form');
});

// Handle trainer signup submission
router.post('/trainer-signup', trainerController.signupTrainer);

// Render trainer login form
router.get('/trainer_login', trainerController.renderTrainerLogin);

// Handle trainer login submission
router.post('/trainer/login', trainerController.loginTrainer);

module.exports = router;