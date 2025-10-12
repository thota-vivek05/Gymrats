// Import dependencies
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Dashboard Route
router.get('/dashboard', adminController.getDashboard);
router.get('/', (req, res) => res.redirect('/admin/dashboard'));

// User Routes
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Trainer Routes
router.get('/trainers', adminController.getTrainers);
router.get('/api/trainers', adminController.searchTrainers);
router.get('/api/trainers/stats', adminController.getTrainerStats);
router.post('/trainers', adminController.createTrainer);
router.put('/trainers/:id', adminController.updateTrainer);
router.delete('/trainers/:id', adminController.deleteTrainer);
// Add this route in adminRoutes.js - after the existing trainer routes
// router.get('/api/trainers', adminController.searchTrainers);


// Membership Routes
router.get('/memberships', adminController.getMemberships);
router.post('/memberships', adminController.createMembership);
router.put('/memberships/:id', adminController.updateMembership);
router.delete('/memberships/:id', adminController.deleteMembership);

// Nutrition Plan Routes
router.get('/nutrition-plans', adminController.getNutritionPlans);
router.post('/nutrition-plans', adminController.createNutritionPlan);
router.put('/nutrition-plans/:id', adminController.updateNutritionPlan);
router.delete('/nutrition-plans/:id', adminController.deleteNutritionPlan);

// Exercise Routes
router.get('/exercises', adminController.getExercises);
router.post('/exercises', adminController.createExercise);
router.put('/exercises/:id', adminController.updateExercise);
router.delete('/exercises/:id', adminController.deleteExercise);
router.get('/api/exercises', adminController.searchExercises);

// Verifier Routes
router.get('/verifier', adminController.getVerifiers);
// router.get('/verifier', adminController.getVerifierPage);
router.get('/verifier_form', (req, res) => {
    res.render('verifier_form'); // You might need to create this view
});
router.post('/verifier', adminController.createVerifier);
router.put('/verifier/:id', adminController.updateVerifier);
router.delete('/verifier/:id', adminController.deleteVerifier);

// Settings Routes
router.get('/settings', adminController.getSettings);
router.post('/settings', adminController.updateSettings);

// Debug route to check data
router.get('/debug/trainer-stats', async (req, res) => {
    try {
        const Membership = require('../model/Membership');
        const Trainer = require('../model/Trainer');
        const TrainerApplication = require('../model/TrainerApplication');
        
        const activeMemberships = await Membership.find({ status: 'Active' });
        const trainers = await Trainer.find({});
        const pendingApps = await TrainerApplication.countDocuments({ status: 'Pending' });
        
        let revenue = 0;
        const allSpecializations = new Set();
        
        activeMemberships.forEach(membership => {
            let monthlyPrice = 0;
            switch(membership.plan) {
                case 'basic': monthlyPrice = 299; break;
                case 'gold': monthlyPrice = 599; break;
                case 'platinum': monthlyPrice = 999; break;
                default: monthlyPrice = 0;
            }
            
            const currentDate = new Date();
            const endDate = new Date(membership.end_date);
            
            if (endDate > currentDate) {
                const monthsDiff = (endDate.getFullYear() - currentDate.getFullYear()) * 12 + 
                                 (endDate.getMonth() - currentDate.getMonth());
                const remainingMonths = Math.max(1, monthsDiff);
                revenue += monthlyPrice * remainingMonths;
            }
        });

        trainers.forEach(trainer => {
            if (trainer.specializations) {
                trainer.specializations.forEach(spec => {
                    if (spec) allSpecializations.add(spec);
                });
            }
        });

        res.json({
            activeMembershipsCount: activeMemberships.length,
            revenue,
            specializations: Array.from(allSpecializations),
            specializationCount: allSpecializations.size,
            pendingApplications: pendingApps,
            trainersCount: trainers.length,
            sampleMembership: activeMemberships.length > 0 ? activeMemberships[0] : 'No memberships found',
            sampleTrainer: trainers.length > 0 ? trainers[0] : 'No trainers found'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;