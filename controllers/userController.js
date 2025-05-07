const bcrypt = require('bcryptjs');
const User = require('../model/User'); // Adjust path based on your project structure

// Login Controller
const loginUser = async (req, res) => {
    try {
        const { email, password, loginMembershipPlan } = req.body;

        // Validate input
        if (!email || !password || !loginMembershipPlan) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Validate membership plan
        if (user.membershipType.toLowerCase() !== loginMembershipPlan.toLowerCase()) {
            return res.status(400).json({ error: 'Selected membership plan does not match user membership' });
        }

        // Set user session (assuming you're using express-session)
        req.session.user = {
            id: user._id,
            email: user.email,
            full_name: user.full_name,
            membershipType: user.membershipType
        };

        res.status(200).json({ message: 'Login successful', redirect: '/userdashboard_p' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Signup Controller
const signupUser = async (req, res) => {
    try {
        const {
            userFullName,
            dateOfBirth,
            gender,
            userEmail,
            phoneNumber,
            userPassword,
            userConfirmPassword,
            membershipPlan,
            membershipDuration,
            cardType,
            cardNumber,
            expirationDate,
            cvv,
            terms
        } = req.body;

        // Validate input
        if (
            !userFullName ||
            !dateOfBirth ||
            !gender ||
            !userEmail ||
            !phoneNumber ||
            !userPassword ||
            !userConfirmPassword ||
            !membershipPlan ||
            !membershipDuration ||
            !cardType ||
            !cardNumber ||
            !expirationDate ||
            !cvv ||
            !terms
        ) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Validate password match
        if (userPassword !== userConfirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match' });
        }

        // Validate email format
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(userEmail)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        // Validate phone number
        const phoneRegex = /^\+?[\d\s-]{10,}$/;
        if (!phoneRegex.test(phoneNumber)) {
            return res.status(400).json({ error: 'Invalid phone number' });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email: userEmail });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(userPassword, saltRounds);

        // Create new user
        const newUser = new User({
            full_name: userFullName,
            email: userEmail,
            password_hash,
            dob: new Date(dateOfBirth),
            gender: gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase(),
            phone: phoneNumber,
            membershipType: membershipPlan.charAt(0).toUpperCase() + membershipPlan.slice(1).toLowerCase(),
            // You might want to store payment info separately or process it via a payment gateway
        });

        // Save user to database
        await newUser.save();

        // Set user session
        req.session.user = {
            id: newUser._id,
            email: newUser.email,
            full_name: newUser.full_name,
            membershipType: newUser.membershipType
        };

        res.status(201).json({ message: 'Signup successful', redirect: '/login_signup' });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    loginUser,
    signupUser
};