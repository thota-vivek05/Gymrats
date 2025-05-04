const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');

const app = express();
const PORT = process.env.PORT || 3000;

// Import routes
const adminRoutes = require('./Routes/adminRoutes');

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
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
mongoose.connect('mongodb://localhost:27017/gymrats', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('Connected to MongoDB database');
    // Initialize database with sample data after connection
    initializeDatabase();
})
.catch(err => {
    console.error('MongoDB connection error:', err);
});

// Insert sample data function
async function initializeDatabase() {
    try {
        // Check if there's already data in the database
        const User = require('./model/User');
        const Membership = require('./model/Membership');
        
        const userCount = await User.countDocuments();
        if (userCount > 0) {
            console.log('Database already has data, skipping sample data insertion');
            return;
        }

        console.log("Inserting sample data...");
        
        // Sample users data
        const users = [
            {
                name: 'Anvesh cheela',
                email: 'anvesh@example.com',
                password: 'password123',
                dob: '2005-03-15',
                gender: 'male',
                phone: '1234567890'
            },
            {
                name: 'vivek',
                email: 'vivek@example.com',
                password: 'password456',
                dob: '2005-07-22',
                gender: 'male',
                phone: '9876543210'
            },
            {
                name: 'jay Johnson',
                email: 'jay@example.com',
                password: 'password789',
                dob: '2005-11-30',
                gender: 'male',
                phone: '5551234567'
            }
        ];

        // Insert each user and their membership
        for (const userData of users) {
            // Hash the password
            const hashedPassword = await bcrypt.hash(userData.password, 10);
            
            // Create and save user
            const user = new User({
                full_name: userData.name,
                email: userData.email,
                password_hash: hashedPassword,
                dob: userData.dob,
                gender: userData.gender,
                phone: userData.phone
            });
            
            const savedUser = await user.save();
            
            // Determine plan details based on user
            let plan, duration, price, cardType, cardLastFour;
            
            if (userData.name === 'John Smith') {
                plan = 'basic';
                duration = 3;
                price = 29 * 3;
                cardType = 'visa';
                cardLastFour = '4321';
            } else if (userData.name === 'Jane Doe') {
                plan = 'gold';
                duration = 6;
                price = 59 * 6;
                cardType = 'mastercard';
                cardLastFour = '8765';
            } else {
                plan = 'platinum';
                duration = 12;
                price = 99 * 12;
                cardType = 'amex';
                cardLastFour = '2468';
            }
            
            // Calculate end date
            const startDate = new Date();
            const endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + duration);
            
            // Create and save membership
            const membership = new Membership({
                user_id: savedUser._id,
                plan: plan,
                duration: duration,
                start_date: startDate,
                end_date: endDate,
                price: price,
                payment_method: 'credit_card',
                card_type: cardType,
                card_last_four: cardLastFour
            });
            
            await membership.save();
        }
        
        console.log('Sample data inserted successfully!');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
}

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

// Use MVC routes for admin pages
app.use('/admin', adminRoutes);

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

// Routes for static pages
const pages = [
    'about', 'blog', 'calculators', 'contact', 'home', 'isolation',
    'login_signup', 'nutrition', 'privacy_policy', 'schedule', 'signup',
    'terms', 'testimonial', 'trainer_form', 'trainer', 'trainers',
    'verifier_form', 'verifier', 'workout_plans'
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
});