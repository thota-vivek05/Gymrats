const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const methodOverride = require('method-override');
process.env.TZ = 'Asia/Kolkata';

const app = express();
const PORT = process.env.PORT || 3000;

// Import routes
const adminRoutes = require('./Routes/adminRoutes');
const userRoutes = require('./Routes/userRoutes');
const trainerRoutes = require('./Routes/trainerRoutes');
const verifierRoutes = require('./Routes/verifierRoutes');

// View engine setup
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

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
    .then(() => {
        console.log('Connected to MongoDB database');
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

// Middleware to make currentPage available in views
app.use((req, res, next) => {
    res.locals.currentPage = '';
    res.locals.user = req.session.user || null;
    next();
});

// Use MVC routes
app.use('/admin', adminRoutes);
app.use('/', userRoutes);
app.use('/', trainerRoutes);
app.use('/verifier', verifierRoutes);

// Redirect legacy admin URLs to new MVC routes
app.get('/admin_dashboard', (req, res) => res.redirect('/admin/dashboard'));
app.get('/admin_user', (req, res) => res.redirect('/admin/users'));
app.get('/admin_trainers', (req, res) => res.redirect('/admin/trainers'));
app.get('/admin_membership', (req, res) => res.redirect('/admin/memberships'));
app.get('/admin_nutrition', (req, res) => res.redirect('/admin/nutrition-plans'));
app.get('/admin_exercises', (req, res) => res.redirect('/admin/exercises'));
app.get('/admin_verifier', (req, res) => res.redirect('/admin/verifier'));
app.get('/admin_settings', (req, res) => res.redirect('/admin/settings'));

// Routes for static pages
const pages = [
    'about', 'blog', 'calculators', 'contact', 'home', 'isolation',
    'login_signup', 'nutrition', 'privacy_policy', 'schedule', 'signup',
    'terms', 'testimonial', 'trainer_form', 'trainer', 'trainers',
    'verifier_form', 'verifier', 'workout_plans', 'userdashboard_b',
    'userdashboard_g', 'userdashboard_p', 'trainer_login', 'edit_nutritional_plan',
    'admin_login', 'pendingverifications', 'verifier_login', 'user_nutrition',
    'user_exercises', 'userprofile'
];

pages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.render(page);
    });
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