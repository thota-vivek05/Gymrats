const express = require('express');
const router = express.Router();
const verifierController = require('../controllers/verifierController');

// GET login page
router.get('/login', verifierController.getLoginPage);

// POST login
router.post('/login', verifierController.loginVerifier);

// GET dashboard (requires login)
router.get('/', verifierController.getDashboard);

// GET registration form
router.get('/register', verifierController.getRegistrationPage);

// POST registration
router.post('/register', verifierController.registerVerifier);

router.get('/pendingverifications', verifierController.showPendingVerifications);
router.get('/verify/:id', verifierController.getVerificationDetails);
router.post('/verify/:id', verifierController.processVerification);
router.get('/approve/:id', verifierController.approveTrainer);
router.get('/reject/:id', verifierController.rejectTrainer);
module.exports = router;