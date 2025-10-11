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

//REYNA
router.get('/approvedverifications', verifierController.requireAuth, verifierController.showApprovedVerifications);
router.get('/rejectedverifications', verifierController.requireAuth, verifierController.showRejectedVerifications);

router.get('/verify/:id', verifierController.getVerificationDetails);
router.post('/verify/:id', verifierController.processVerification);

//REYNA
router.get('/approve/:id', verifierController.requireAuth, verifierController.approveTrainer);
router.get('/reject/:id', verifierController.requireAuth, verifierController.rejectTrainer);

module.exports = router;
