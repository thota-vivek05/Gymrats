const bcrypt = require('bcryptjs');
const TrainerApplication = require('../model/TrainerApplication');
const Trainer = require('../model/Trainer');

const signupTrainer = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            password,
            confirmPassword,
            phone,
            experience,
            specializations,
            termsAgree
        } = req.body;

        console.log('Trainer signup request received:', {
            firstName,
            lastName,
            email,
            phone,
            experience,
            specializations
        });

        // Validate input
        if (
            !firstName ||
            !lastName ||
            !email ||
            !password ||
            !confirmPassword ||
            !phone ||
            !experience ||
            !specializations ||
            !termsAgree
        ) {
            console.log('Validation failed: Missing fields');
            return res.status(400).json({ error: 'All fields are required, including terms agreement' });
        }

        // Validate password match
        if (password !== confirmPassword) {
            console.log('Validation failed: Passwords do not match');
            return res.status(400).json({ error: 'Passwords do not match' });
        }

        // Validate email format
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(email)) {
            console.log('Validation failed: Invalid email:', email);
            return res.status(400).json({ error: 'Invalid email address' });
        }

        // Validate phone number
        const phoneRegex = /^\+?[\d\s-]{10,}$/;
        if (!phoneRegex.test(phone)) {
            console.log('Validation failed: Invalid phone number:', phone);
            return res.status(400).json({ error: 'Invalid phone number' });
        }

        // Validate experience
        const validExperience = ['1-2', '3-5', '5-10', '10+'];
        if (!validExperience.includes(experience)) {
            console.log('Validation failed: Invalid experience:', experience);
            return res.status(400).json({ error: 'Invalid experience selection' });
        }

        // Validate specializations
        const validSpecializations = [
            'Weight Loss',
            'Muscle Gain',
            'Flexibility',
            'Cardiovascular',
            'Strength Training',
            'Post-Rehab',
            'Sports Performance',
            'Nutrition'
        ];
        if (!Array.isArray(specializations) || specializations.length === 0) {
            console.log('Validation failed: No specializations selected');
            return res.status(400).json({ error: 'At least one specialization must be selected' });
        }
        for (const spec of specializations) {
            if (!validSpecializations.includes(spec)) {
                console.log('Validation failed: Invalid specialization:', spec);
                return res.status(400).json({ error: `Invalid specialization: ${spec}` });
            }
        }

        // Check if email already exists
        const existingApplication = await TrainerApplication.findOne({ email });
        if (existingApplication) {
            console.log('Validation failed: Email already registered:', email);
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);
        console.log('Password hashed for:', email);

        // Create new trainer application
        const newApplication = new TrainerApplication({
            firstName,
            lastName,
            email,
            password_hash,
            phone,
            experience,
            specializations,
            status: 'Pending'
        });
        console.log('New trainer application created:', newApplication);

        // Save to database
        await newApplication.save();
        console.log('Trainer application saved to MongoDB:', email);

        // Set session (optional)
        if (req.session) {
            req.session.trainerApplication = {
                id: newApplication._id,
                email: newApplication.email,
                firstName: newApplication.firstName,
                lastName: newApplication.lastName
            };
            console.log('Session set for trainer application:', email);
        }

        res.status(201).json({ message: 'Trainer application submitted successfully', redirect: '/trainer_login' });
    } catch (error) {
        console.error('Trainer signup error:', error);
        if (error.code === 11000) {
            console.log('MongoDB error: Duplicate email:', email);
            return res.status(400).json({ error: 'Email already registered' });
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            console.log('MongoDB validation errors:', messages);
            return res.status(400).json({ error: messages.join(', ') });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

const loginTrainer = async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('Trainer login request received:', { email });

        // Validate input
        if (!email || !password) {
            console.log('Validation failed: Missing email or password');
            return res.status(400).render('trainer_login', {
                errorMessage: 'Email and password are required',
                email
            });
        }

        // Find trainer by email
        const trainer = await Trainer.findOne({ email });
        if (!trainer) {
            console.log('Trainer not found:', email);
            return res.status(401).render('trainer_login', {
                errorMessage: 'Invalid email or password',
                email
            });
        }

        // Check if trainer is active
        if (trainer.status !== 'Active') {
            console.log('Trainer account not active:', email, trainer.status);
            return res.status(403).render('trainer_login', {
                errorMessage: `Your account is ${trainer.status.toLowerCase()}. Please contact support.`,
                email
            });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, trainer.password_hash);
        if (!isMatch) {
            console.log('Invalid password for:', email);
            return res.status(401).render('trainer_login', {
                errorMessage: 'Invalid email or password',
                email
            });
        }

        // Set session
        req.session.trainer = {
            id: trainer._id,
            email: trainer.email,
            name: trainer.name
        };
        console.log('Session set for trainer:', email);

        // Redirect to dashboard
        res.redirect('/trainer');
    } catch (error) {
        console.error('Trainer login error:', error);
        res.status(500).render('trainer_login', {
            errorMessage: 'Server error. Please try again later.',
            email: req.body.email || ''
        });
    }
};

const renderTrainerLogin = (req, res) => {
    res.render('trainer_login', {
        errorMessage: null,
        successMessage: null,
        email: ''
    });
};

module.exports = {
    signupTrainer,
    loginTrainer,
    renderTrainerLogin
};