// controllers/authController.js

const User = require('../model/User');
const Trainer = require('../model/Trainer');
const TrainerApplication = require('../model/TrainerApplication');
const Verifier = require('../model/Verifier');

// Login/signup page
exports.getLoginSignup = (req, res) => {
    res.render('login_signup', {
        errorMessage: req.query.error || null,
        successMessage: req.query.success || null,
        email: req.query.email || null
    });
};

// Trainer login page
exports.getTrainerLogin = (req, res) => {
    res.render('trainer_login', {
        errorMessage: req.query.error || null,
        successMessage: req.query.success || null,
        email: req.query.email || null
    });
};

// Trainer application form
exports.getTrainerForm = (req, res) => {
    res.render('trainer_form');
};

// Verifier application form
exports.getVerifierForm = (req, res) => {
    res.render('verifier_form');
};

// Logout
exports.logout = (req, res) => {
    req.session.destroy();
    res.redirect('/home');
};// controllers/authController.js

// Login/Signup page
exports.getLoginSignup = (req, res) => {
    res.render('login_signup', { user: req.session.user || null });
};

// Trainer login page
exports.getTrainerLogin = (req, res) => {
    res.render('trainer_login', { user: req.session.user || null });
};

// Trainer registration form
exports.getTrainerForm = (req, res) => {
    res.render('trainer_form', { user: req.session.user || null });
};

// Verifier form
exports.getVerifierForm = (req, res) => {
    res.render('verifier_form', { user: req.session.user || null });
};

// Logout
exports.logout = (req, res) => {
    req.session.destroy();
    res.redirect('/home');
};