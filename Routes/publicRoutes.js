// routes/publicRoutes.js

const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

// Home and general pages
router.get('/', publicController.getHome);
router.get('/home', publicController.getHome);
router.get('/about', publicController.getAbout);
router.get('/contact', publicController.getContact);
router.get('/blog', publicController.getBlog);
router.get('/testimonial', publicController.getTestimonials);
router.get('/privacy_policy', publicController.getPrivacyPolicy);
router.get('/terms', publicController.getTerms);

// Fitness content pages
router.get('/isolation', publicController.getExercises);
router.get('/nutrition', publicController.getNutrition);
router.get('/workout_plans', publicController.getWorkoutPlans);
router.get('/calculators', publicController.getCalculators);

module.exports = router;