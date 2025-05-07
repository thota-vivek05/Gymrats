// controllers/verifierController.js

const Verifier = require('../model/Verifier');
const TrainerApplication = require('../model/TrainerApplication');
const Trainer = require('../model/Trainer');

// Verifier dashboard
exports.getDashboard = async (req, res) => {
    try {
        if (!req.session.verifier) {
            res.render('verifier', { user: req.session.user || null });
            return;
        }

        const verifierId = req.session.verifier._id;
        const verifier = await Verifier.findById(verifierId);
        
        if (!verifier) {
            res.render('verifier', { user: req.session.user || null });
            return;
        }

        // Get pending applications count
        const pendingCount = await TrainerApplication.countDocuments({ 
            status: 'Pending'
        });
        
        // Get in progress applications count
        const inProgressCount = await TrainerApplication.countDocuments({ 
            status: 'In Progress',
            verifierId: verifierId
        });
        
        // Get completed applications count
        const completedCount = await TrainerApplication.countDocuments({
            verifierId: verifierId,
            status: { $in: ['Approved', 'Rejected'] }
        });

        res.render('verifier', {
            user: req.session.user || null,
            verifier,
            pendingCount,
            inProgressCount,
            completedCount
        });
    } catch (error) {
        console.error('Error fetching verifier dashboard:', error);
        res.render('verifier', { user: req.session.user || null });
    }
};

// Pending verifications
exports.getPendingVerifications = async (req, res) => {
    try {
        if (!req.session.verifier) {
            return res.redirect('/auth/login_signup');
        }

        const pendingApplications = await TrainerApplication.find({
            status: 'Pending'
        }).sort({ submittedDate: 1 });

        res.render('pending_verifications', {
            user: req.session.user || null,
            pendingApplications
        });
    } catch (error) {
        console.error('Error fetching pending verifications:', error);
        res.redirect('/verifier');
    }
};

// Completed verifications
exports.getCompletedVerifications = async (req, res) => {
    try {
        if (!req.session.verifier) {
            return res.redirect('/auth/login_signup');
        }

        const verifierId = req.session.verifier._id;
        const completedApplications = await TrainerApplication.find({
            verifierId: verifierId,
            status: { $in: ['Approved', 'Rejected'] }
        }).sort({ submittedDate: -1 });

        res.render('completed_verifications', {
            user: req.session.user || null,
            completedApplications
        });
    } catch (error) {
        console.error('Error fetching completed verifications:', error);
        res.redirect('/verifier');
    }
};

// Trainer directory
exports.getTrainerDirectory = async (req, res) => {
    try {
        const trainers = await Trainer.find({ verificationStatus: 'Approved' });

        res.render('trainer_directory', {
            user: req.session.user || null,
            trainers
        });
    } catch (error) {
        console.error('Error fetching trainer directory:', error);
        res.redirect('/verifier');
    }
};

// Calendar
exports.getCalendar = (req, res) => {
    res.render('calendar', { user: req.session.user || null });
};

// Messages
exports.getMessages = (req, res) => {
    res.render('messages', { user: req.session.user || null });
};

// Settings
exports.getSettings = (req, res) => {
    res.render('settings', { user: req.session.user || null });
};