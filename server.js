const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session setup
app.use(
    session({
        secret: 'gymrats-secret-key',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false, maxAge: 3600000 } // 1 hour
    })
);

// Initialize SQLite database - using in-memory database as requested
const db = new sqlite3.Database(':memory:', (err) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Connected to in-memory SQLite database');
        initializeDatabase();
    }
});

// Create database tables if they don't exist
function initializeDatabase() {
    db.serialize(() => {
        console.log("Creating tables...");

        // Create users table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                dob TEXT NOT NULL,
                gender TEXT NOT NULL,
                phone TEXT NOT NULL,
                profile_pic TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `, function(err) {
            if (err) console.error('Error creating users table:', err);
        });

        // Create memberships table
        db.run(`
            CREATE TABLE IF NOT EXISTS memberships (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                plan TEXT NOT NULL,
                duration INTEGER NOT NULL,
                start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                end_date TIMESTAMP,
                price REAL NOT NULL,
                payment_method TEXT NOT NULL,
                card_type TEXT,
                card_last_four TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `, function(err) {
            if (err) {
                console.error('Error creating memberships table:', err);
            } else {
                console.log("Tables created successfully!");
                // Only insert sample data after table creation is completed
                insertSampleData();
            }
        });
    });
}


// Insert sample data
async function insertSampleData() {
    // Create sample users
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

    // Insert each user
    users.forEach(async (user) => {
        try {
            // Hash the password
            const hashedPassword = await bcrypt.hash(user.password, 10);
            
            // Insert user
            db.run(`INSERT INTO users (full_name, email, password_hash, dob, gender, phone)
                    VALUES (?, ?, ?, ?, ?, ?)`,
                [user.name, user.email, hashedPassword, user.dob, user.gender, user.phone],
                function(err) {
                    if (err) {
                        console.error('Error inserting user:', err.message);
                        return;
                    }
                    
                    // Get the user ID
                    const userId = this.lastID;
                    
                    // Determine plan details based on user
                    let plan, duration, price, cardType, cardLastFour;
                    
                    if (user.name === 'John Smith') {
                        plan = 'basic';
                        duration = 3;
                        price = 29 * 3;
                        cardType = 'visa';
                        cardLastFour = '4321';
                    } else if (user.name === 'Jane Doe') {
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
                    
                    // Insert membership
                    db.run(`INSERT INTO memberships 
                            (user_id, plan, duration, start_date, end_date, price, payment_method, card_type, card_last_four)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [userId, plan, duration, startDate.toISOString(), endDate.toISOString(), 
                        price, 'credit_card', cardType, cardLastFour],
                        (err) => {
                            if (err) {
                                console.error('Error inserting membership:', err.message);
                            }
                        }
                    );
                }
            );
        } catch (err) {
            console.error('Error hashing password:', err);
        }
    });
    
    console.log('Sample data inserted!');
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

// Routes for static pages
const pages = [
    'about', 'admin_dashboard', 'admin_exercises', 'admin_membership', 'admin_nutrition',
    'admin_settings', 'admin_trainers', 'admin_user', 'admin_verifier', 'admin_workouts',
    'blog', 'calculators', 'contact', 'home', 'isolation', 'login_signup',
    'nutrition', 'privacy_policy', 'schedule', 'signup', 'terms', 'testimonial',
    'trainer_form', 'trainer', 'trainers', 'verifier_form', 'verifier', 'workout_plans', 'userprofile'
];

pages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.render(page, { user: req.session.user || null });
    });
});

// Login Route
app.post('/api/login', (req, res) => {
    const { email, password, membershipPlan } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    
    // Find user by email
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        
        // Compare password
        try {
            const passwordMatch = await bcrypt.compare(password, user.password_hash);
            
            if (!passwordMatch) {
                return res.status(401).json({ success: false, message: 'Invalid email or password' });
            }
            
            // Check membership plan
            db.get(`SELECT * FROM memberships WHERE user_id = ? AND plan = ? AND end_date > datetime('now')`,
                [user.id, membershipPlan], (err, membership) => {
                    if (err) {
                        console.error(err.message);
                        return res.status(500).json({ success: false, message: 'Internal server error' });
                    }
                    
                    // Store user in session
                    req.session.userId = user.id;
                    req.session.email = user.email;
                    req.session.fullName = user.full_name;
                    req.session.membershipPlan = membershipPlan;
                    req.session.user = {
                        id: user.id,
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
                }
            );
        } catch (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    });
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
        
        // Hash password
        const hashedPassword = await bcrypt.hash(userPassword, 10);
        
        // Check if email already exists
        db.get('SELECT * FROM users WHERE email = ?', [userEmail], (err, existingUser) => {
            if (err) {
                console.error(err.message);
                return res.status(500).json({ success: false, message: 'Internal server error' });
            }
            
            if (existingUser) {
                return res.status(400).json({ success: false, message: 'Email already in use' });
            }
            
            // Insert new user
            db.run(`INSERT INTO users (full_name, email, password_hash, dob, gender, phone)
                    VALUES (?, ?, ?, ?, ?, ?)`,
                [userFullName, userEmail, hashedPassword, dateOfBirth, gender, phoneNumber],
                function(err) {
                    if (err) {
                        console.error(err.message);
                        return res.status(500).json({ success: false, message: 'Error creating user' });
                    }
                    
                    const userId = this.lastID;
                    
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
                    
                    // Insert membership
                    db.run(`INSERT INTO memberships 
                            (user_id, plan, duration, start_date, end_date, price, payment_method, card_type, card_last_four)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [userId, membershipPlan, membershipDuration, startDate.toISOString(), endDate.toISOString(), 
                         totalPrice, 'credit_card', cardType, cardLastFour],
                        (err) => {
                            if (err) {
                                console.error(err.message);
                                return res.status(500).json({ success: false, message: 'Error creating membership' });
                            }
                            
                            // Store user in session
                            req.session.userId = userId;
                            req.session.email = userEmail;
                            req.session.fullName = userFullName;
                            req.session.membershipPlan = membershipPlan;
                            req.session.user = {
                                id: userId,
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
                        }
                    );
                }
            );
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Old Signup route - keep for compatibility if needed
app.post('/signup', async (req, res) => {
    const { user_name, user_email, user_password } = req.body;
    if (!user_name || !user_email || !user_password) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user_email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
    }
    if (user_password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    try {
        db.get("SELECT * FROM users WHERE email = ?", [user_email], async (err, row) => {
            if (err) return res.status(500).json({ success: false, message: 'Database error' });
            if (row) return res.status(400).json({ success: false, message: 'Email already registered' });

            const hashedPassword = await bcrypt.hash(user_password, 10);
            db.run("INSERT INTO users (full_name, email, password_hash, dob, gender, phone) VALUES (?, ?, ?, ?, ?, ?)",
                [user_name, user_email, hashedPassword, '2000-01-01', 'not specified', 'not provided'],
                function (err) {
                    if (err) return res.status(500).json({ success: false, message: 'Database error' });
                    res.status(201).json({ success: true, message: 'Signup successful' });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Dashboard routes
app.get('/userdashboard_b', isAuthenticated, (req, res) => {
    res.render('userdashboard_b', { user: req.session.user });
});

app.get('/userdashboard_g', isAuthenticated, (req, res) => {
    res.render('userdashboard_g', { user: req.session.user });
});

app.get('/userdashboard_p', isAuthenticated, (req, res) => {
    res.render('userdashboard_p', { user: req.session.user });
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login_signup');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`http://localhost:${PORT}/home`);
});