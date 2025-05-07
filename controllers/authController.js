// controllers/authController.js

const User = require('../model/User');
const Trainer = require('../model/Trainer');
const Verifier = require('../model/Verifier');
const Membership = require('../model/Membership');
const bcrypt = require('bcryptjs');

// Get login/signup page
exports.getLoginSignup = (req, res) => {
    res.render('login_signup', { user: null });
};

// Get trainer login page
exports.getTrainerLogin = (req, res) => {
    res.render('trainer_login', { user: null });
};

// Get trainer registration form
exports.getTrainerForm = (req, res) => {
    res.render('trainer_form', { user: null });
};

// Get verifier registration form
exports.getVerifierForm = (req, res) => {
    res.render('verifier_form', { user: null });
};

// User login
// In controllers/authController.js - Check the login function
// In controllers/authController.js - Update the login method

// controllers/authController.js - Updated redirect URL
exports.login = async (req, res) => {
    try {
        const { email, password, membershipPlan } = req.body;
        
        // Find the user by email
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.json({ success: false, message: 'Invalid email or password' });
        }
        
        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.json({ success: false, message: 'Invalid email or password' });
        }
        
        // Find membership
        const membership = await Membership.findOne({ 
            user_id: user._id,
            plan: membershipPlan
        });
        
        if (!membership) {
            return res.json({ success: false, message: 'Membership not found' });
        }
        
        // Check if membership is expired
        const currentDate = new Date();
        if (currentDate > membership.end_date) {
            return res.json({ success: false, message: 'Your membership has expired' });
        }
        
        // Store user data in session
        req.session.user = {
            id: user._id,
            email: user.email,
            name: user.full_name,
            membership: membership.plan
        };
        
        // Determine the correct dashboard URL based on membership plan
        let redirectUrl;
       // In authController.js - Corrected redirect URLs
// Determine the correct dashboard URL based on membership plan

switch(membership.plan.toLowerCase()) {
    case 'platinum':
        redirectUrl = '/userdashboard_p';
        break;
    case 'gold':
        redirectUrl = '/userdashboard_g';
        break;
    case 'basic':
        redirectUrl = '/userdashboard_b';
        break;
    default:
        // Default to basic dashboard if plan type is unknown
        redirectUrl = '/userdashboard_b';
}
        // Save session explicitly before redirecting
        req.session.save(err => {
            if (err) {
                console.error('Session save error:', err);
                return res.json({ success: false, message: 'Error saving session' });
            }
            
            // Return success response with appropriate dashboard URL
            return res.json({ 
                success: true, 
                message: 'Login successful!', 
                redirectUrl: redirectUrl
            });
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// User signup
// controllers/authController.js - Update the signup method

exports.signup = async (req, res) => {
    try {
        const {
            userFullName, dateOfBirth, gender, userEmail, phoneNumber, userPassword,
            membershipPlan, membershipDuration, cardType, cardNumber, expirationDate, cvv
        } = req.body;
        
        // Validate required fields
        if (!userFullName || !dateOfBirth || !gender || !userEmail || !phoneNumber || !userPassword ||
            !membershipPlan || !membershipDuration || !cardType || !cardNumber) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }
        
        // Check if email already exists
        const existingUser = await User.findOne({ email: userEmail });
        
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already in use' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(userPassword, 10);
        
        // Create new user
        const newUser = new User({
            full_name: userFullName,
            email: userEmail,
            password_hash: hashedPassword,
            dob: dateOfBirth,
            gender: gender,
            phone: phoneNumber
        });
        
        // Save user
        const savedUser = await newUser.save();
        
        // Calculate price based on plan
        let price;
        switch(membershipPlan) {
            case 'basic':
                price = 29;
                break;
            case 'gold':
                price = 59;
                break;
            case 'platinum':
                price = 99;
                break;
            default:
                price = 29;
        }
        
        // Total price based on duration
        const totalPrice = price * parseInt(membershipDuration);
        
        // Calculate start and end dates
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + parseInt(membershipDuration));
        
        // Get last 4 digits of card
        const cardLastFour = cardNumber.slice(-4);
        
        // Create new membership
        const newMembership = new Membership({
            user_id: savedUser._id,
            plan: membershipPlan,
            duration: parseInt(membershipDuration),
            start_date: startDate,
            end_date: endDate,
            price: totalPrice,
            payment_method: 'credit_card',
            card_type: cardType,
            card_last_four: cardLastFour
        });
        
        // Save membership
        await newMembership.save();
        
        // Don't store user in session, just return success with redirect to login
        return res.json({ 
            success: true, 
            message: 'Account created successfully! Please login with your credentials.', 
            redirectUrl: '/login_signup' // Redirect to login page instead of dashboard
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
// Trainer login
exports.trainerLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }
        
        // Find trainer by email
        const trainer = await Trainer.findOne({ email: email });
        
        if (!trainer) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        
        // Compare password
        const passwordMatch = await bcrypt.compare(password, trainer.password_hash);
        
        if (!passwordMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        
        // Store trainer in session
        req.session.trainer = {
            _id: trainer._id,
            name: trainer.name,
            email: trainer.email
        };
        
        // Return success with redirect information
        return res.json({ 
            success: true, 
            message: 'Login successful', 
            redirectUrl: '/trainer'
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Logout
exports.logout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Error logging out');
        }
        res.redirect('/home');
    });
};

// In controllers/userController.js - Fix the authentication middleware
exports.isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    // Just redirect to login without adding more redirects
    return res.redirect('/auth/login_signup');
};

// Modify the dashboard function to handle session properly
exports.getDashboard = async (req, res) => {
    try {
        // Check if session exists
        if (!req.session.user) {
            return res.redirect('/auth/login_signup');
        }

        const userId = req.session.user.id;
        const user = await User.findById(userId);
        
        if (!user) {
            // Clear invalid session and redirect
            req.session.destroy(err => {
                if (err) console.error("Session destroy error", err);
                return res.redirect('/auth/login_signup');
            });
            return;
        }

        // Rest of your code...
    } catch (error) {
        console.error('Error fetching user dashboard:', error);
        // Don't redirect on error, just render an error page
        return res.status(500).render('error', { message: 'An error occurred loading the dashboard' });
    }
};