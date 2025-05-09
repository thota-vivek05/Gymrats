const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const methodOverride = require('method-override');

const app = express();
const PORT = process.env.PORT || 3000;

// Import routes
const adminRoutes = require('./Routes/adminRoutes');
const userRoutes = require('./Routes/userRoutes');
const trainerRoutes = require('./Routes/trainerRoutes');
const WorkoutHistory = require('./model/WorkoutHistory');

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method')); // For PUT/DELETE requests


// Session setup
app.use(
    session({
        secret: 'gymrats-secret-key',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false, maxAge: 3600000 } // 1 hour
    })
);

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/gymrats')
    .then(async () => {
        console.log('Connected to MongoDB database');
        
        // Register models explicitly to ensure collections are created
        mongoose.model('WorkoutHistory');
        
        // You could even check if the collection exists and create it if needed
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        if (!collectionNames.includes('workouthistories')) {
            console.log('WorkoutHistory collection does not exist yet - it will be created when first document is inserted');
        }
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });
// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});
app.use('/uploads', express.static('uploads'));

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login_signup');
    }
};

// Add this middleware after initializing the session middleware
app.use((req, res, next) => {
    res.locals.currentPage = ''; // Default value
    next();
});

// Use MVC routes for admin pages
app.use('/admin', adminRoutes);
app.use('/', userRoutes);
app.use('/', trainerRoutes);


// Redirect legacy admin URLs to the new MVC routes
app.get('/admin_dashboard', (req, res) => res.redirect('/admin/dashboard'));
app.get('/admin_user', (req, res) => res.redirect('/admin/users'));
app.get('/admin_trainers', (req, res) => res.redirect('/admin/trainers'));
app.get('/admin_membership', (req, res) => res.redirect('/admin/memberships'));
app.get('/admin_nutrition', (req, res) => res.redirect('/admin/nutrition-plans'));
app.get('/admin_exercises', (req, res) => res.redirect('/admin/exercises'));
app.get('/admin_workouts', (req, res) => res.redirect('/admin/workout-plans'));
app.get('/admin_verifier', (req, res) => res.redirect('/admin/verifiers'));
app.get('/admin_settings', (req, res) => res.redirect('/admin/settings'));

// Add this to your routes section
app.get('/debug/create-workout-history', async (req, res) => {
    try {
        // Find a user to associate with the workout history
        const User = require('./model/User');
        const user = await User.findOne();
        
        if (!user) {
            return res.status(404).json({ error: 'No users found in database' });
        }
        
        // Create a simple workout history
        const workoutHistory = new WorkoutHistory({
            userId: user._id,
            date: new Date(),
            exercises: [
                {
                    day: 'Monday',
                    name: 'Bench Press',
                    sets: 3,
                    reps: 10,
                    weight: 60,
                    duration: 0,
                    completed: false
                }
            ],
            progress: 0,
            completed: false
        });
        
        const saved = await workoutHistory.save();
        res.json({ 
            success: true, 
            message: 'WorkoutHistory created successfully', 
            data: saved 
        });
    } catch (error) {
        console.error('Error creating workout history:', error);
        res.status(500).json({ error: error.message });
    }
});

// Routes for static pages
const pages = [
    'about', 'blog', 'calculators', 'contact', 'home', 'isolation',
    'login_signup', 'nutrition', 'privacy_policy', 'schedule', 'signup',
    'terms', 'testimonial', 'trainer_form', 'trainer', 'trainers',
    'verifier_form', 'verifier', 'workout_plans', 'userdashboard_b',
    'userdashboard_g', 'userdashboard_p','trainer_login','edit_nutritional_plan',
    'admin_login', 'user_nutrition', 'user_exercises', 'user_profile'
];

pages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.render(page, { user: req.session.user || null });
    });
});

// Login Route
app.post('/api/login', async (req, res) => {
    try {
        const { email, password, membershipPlan } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }
        
        // Find user by email
        const User = require('./model/User');
        const user = await User.findOne({ email: email });
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        
        // Compare password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!passwordMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        
        // Check membership plan - find active membership
        const Membership = require('./model/Membership');
        const currentDate = new Date();
        const membership = await Membership.findOne({
            user_id: user._id,
            plan: membershipPlan,
            end_date: { $gt: currentDate }
        });
        
        if (!membership) {
            return res.status(401).json({ success: false, message: 'Invalid membership plan' });
        }
        
        // Store user in session
        req.session.userId = user._id;
        req.session.email = user.email;
        req.session.fullName = user.full_name;
        req.session.membershipPlan = membershipPlan;
        req.session.user = {
            id: user._id,
            name: user.full_name,
            email: user.email,
            membershipPlan: membershipPlan
        };
        
        // Return success with redirect information
        return res.json({ 
            success: true, 
            message: 'Login successful', 
            redirectUrl: `/userdashboard_${membershipPlan.charAt(0)}`
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Signup Route
app.post('/api/signup', async (req, res) => {
    try {
        const {
            userFullName, dateOfBirth, gender, userEmail, phoneNumber, userPassword,
            membershipPlan, membershipDuration, cardType, cardNumber
        } = req.body;
        
        // Validate required fields
        if (!userFullName || !dateOfBirth || !gender || !userEmail || !phoneNumber || !userPassword ||
            !membershipPlan || !membershipDuration || !cardType || !cardNumber) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }
        
        const User = require('./model/User');
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
        
        const Membership = require('./model/Membership');
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
        
        // Store user in session
        req.session.userId = savedUser._id;
        req.session.email = userEmail;
        req.session.fullName = userFullName;
        req.session.membershipPlan = membershipPlan;
        req.session.user = {
            id: savedUser._id,
            name: userFullName,
            email: userEmail,
            membershipPlan: membershipPlan
        };
        
        // Return success with redirect info
        return res.json({ 
            success: true, 
            message: 'Account created successfully', 
            redirectUrl: `/userdashboard_${membershipPlan.charAt(0)}`
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Error logging out');
        }
        res.redirect('/login_signup');
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`http://localhost:${PORT}/home`);
    console.log(`http://localhost:${PORT}/login_signup`);
    console.log(`http://localhost:${PORT}/trainer_login`);
    console.log(`http://localhost:${PORT}/verifier_login`);
    console.log(`http://localhost:${PORT}/admin_login`);
});