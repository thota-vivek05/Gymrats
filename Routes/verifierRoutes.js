// routes/verifierRoutes.js

const express = require('express');
const router = express.Router();
const verifierController = require('../controllers/verifierController');

// Verifier related routes
router.get('/', verifierController.getDashboard);
router.get('/pending_verifications', verifierController.getPendingVerifications);
router.get('/completed_verifications', verifierController.getCompletedVerifications);
router.get('/trainer_directory', verifierController.getTrainerDirectory);
router.get('/calendar', verifierController.getCalendar);
router.get('/messages', verifierController.getMessages);
router.get('/settings', verifierController.getSettings);

module.exports = router;