const bcrypt = require('bcryptjs');
const User = require('../model/User');
const WorkoutHistory = require('../model/WorkoutHistory');
const NutritionHistory = require('../model/NutritionHistory');

const loginUser = async (req, res) => {
    try {
        const { email, password, loginMembershipPlan } = req.body;

        console.log('Login request received:', { email, loginMembershipPlan });

        if (!email || !password || !loginMembershipPlan) {
            console.log('Validation failed: Missing fields');
            return res.status(400).json({ error: 'All fields are required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            console.log('User not found:', email);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (user.status !== 'Active') {
            console.log('User account not active:', email, user.status);
            return res.status(403).json({ error: `Your account is ${user.status.toLowerCase()}. Please contact support.` });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            console.log('Password mismatch for:', email);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (user.membershipType.toLowerCase() !== loginMembershipPlan.toLowerCase()) {
            console.log('Membership plan mismatch:', { user: user.membershipType, input: loginMembershipPlan });
            return res.status(400).json({ error: 'Selected membership plan does not match user membership' });
        }

        if (!req.session) {
            console.error('Session middleware not initialized');
            return res.status(500).json({ error: 'Session not available. Please try again later.' });
        }
        req.session.user = {
            id: user._id,
            email: user.email,
            full_name: user.full_name,
            membershipType: user.membershipType
        };
        console.log('Session set for user:', user.email);

        let redirectUrl;
        switch (user.membershipType.toLowerCase()) {
            case 'basic':
                redirectUrl = '/userdashboard_b';
                break;
            case 'gold':
                redirectUrl = '/userdashboard_g';
                break;
            case 'platinum':
                redirectUrl = '/userdashboard_p';
                break;
            default:
                console.log('Unknown membership type:', user.membershipType);
                redirectUrl = '/dashboard';
        }
        console.log('Redirecting to:', redirectUrl);

        res.status(200).json({ message: 'Login successful', redirect: redirectUrl });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

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
            terms,
            weight,
            height
        } = req.body;

        console.log('Signup request received:', {
            userFullName, dateOfBirth, gender, userEmail, phoneNumber,
            membershipPlan, membershipDuration, cardType, cardNumber,
            expirationDate, cvv, terms, weight, height
        });

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
            !terms ||
            weight === undefined
        ) {
            console.log('Validation failed: Missing fields');
            return res.status(400).json({ error: 'All fields are required, including weight' });
        }

        if (userPassword !== userConfirmPassword) {
            console.log('Validation failed: Passwords do not match');
            return res.status(400).json({ error: 'Passwords do not match' });
        }

        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(userEmail)) {
            console.log('Validation failed: Invalid email:', userEmail);
            return res.status(400).json({ error: 'Invalid email address' });
        }

        const phoneRegex = /^\+?[\d\s-]{10,}$/;
        if (!phoneRegex.test(phoneNumber)) {
            console.log('Validation failed: Invalid phone number:', phoneNumber);
            return res.status(400).json({ error: 'Invalid phone number' });
        }

        if (isNaN(weight) || weight < 0) {
            console.log('Validation failed: Invalid weight:', weight);
            return res.status(400).json({ error: 'Weight must be a non-negative number' });
        }

        let calculatedBMI = null;
        if (height !== undefined) {
            if (isNaN(height) || height < 0) {
                console.log('Validation failed: Invalid height:', height);
                return res.status(400).json({ error: 'Height must be a non-negative number' });
            }
            const heightInMeters = Number(height) / 100;
            if (heightInMeters > 0) {
                calculatedBMI = Number(weight) / (heightInMeters * heightInMeters);
                calculatedBMI = Math.round(calculatedBMI * 10) / 10;
                console.log('Calculated BMI:', calculatedBMI);
            }
        }

        const existingUser = await User.findOne({ email: userEmail });
        if (existingUser) {
            console.log('Validation failed: Email already registered:', userEmail);
            return res.status(400).json({ error: 'Email already registered' });
        }

        const saltRounds = 10;
        const password_hash = await bcrypt.hash(userPassword, saltRounds);
        console.log('Password hashed for:', userEmail);

        const newUser = new User({
            full_name: userFullName,
            email: userEmail,
            password_hash,
            dob: new Date(dateOfBirth),
            gender: gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase(),
            phone: phoneNumber,
            membershipType: membershipPlan.charAt(0).toUpperCase() + membershipPlan.slice(1).toLowerCase(),
            weight: Number(weight),
            height: height !== undefined ? Number(height) : null,
            BMI: calculatedBMI,
            status: 'Active',
            trainer: null // Trainer can be assigned later
        });
        console.log('New user object created:', newUser);

        await newUser.save();
        console.log('User saved to MongoDB:', userEmail);

        if (!req.session) {
            console.error('Session middleware not initialized');
            console.log('Proceeding without session for user:', userEmail);
        } else {
            req.session.user = {
                id: newUser._id,
                email: newUser.email,
                full_name: newUser.full_name,
                membershipType: newUser.membershipType
            };
            console.log('Session set for user:', userEmail);
        }

        res.status(201).json({ message: 'Signup successful', redirect: '/login_signup' });
    } catch (error) {
        console.error('Signup error:', error);
        if (error.code === 11000) {
            console.log('MongoDB error: Duplicate email:', userEmail);
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

const getUserDashboard = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            console.log('No user session found');
            return res.redirect('/login_signup?form=login');
        }

        const userId = req.session.user.id;
        console.log('Fetching dashboard data for user:', userId);

        const user = await User.findById(userId)
            .populate('trainer')
            .select('full_name weight fitness_goals class_schedules');
        if (!user) {
            console.log('User not found:', userId);
            return res.status(404).json({ error: 'User not found' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        // Fetch today's workout from WorkoutHistory
        const todayWorkout = await WorkoutHistory.findOne({
            userId: userId,
            date: { $gte: today, $lt: tomorrow }
        }).lean() || {};
        const workoutData = {
            name: todayWorkout.name || 'No Workout Scheduled',
            duration: 60, // Default duration since workoutPlanId is not used
            exercises: todayWorkout.exercises || [],
            progress: todayWorkout.progress || 0,
            completed: todayWorkout.completed || false,
            workoutPlanId: todayWorkout._id || null, // Use WorkoutHistory _id instead
            completedExercises: todayWorkout.exercises?.filter(e => e.completed).length || 0,
            totalExercises: todayWorkout.exercises?.length || 0
        };

        // Fetch weekly workouts from WorkoutHistory
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        const weeklyWorkoutsData = await WorkoutHistory.find({
            userId: userId,
            date: { $gte: weekStart, $lt: weekEnd }
        }).lean();
        const weeklyWorkouts = {
            completed: weeklyWorkoutsData.filter(w => w.completed).length,
            total: weeklyWorkoutsData.length
        };

        // Fetch today's nutrition from NutritionHistory
        const todayNutrition = await NutritionHistory.findOne({
            userId: userId,
            date: { $gte: today, $lt: tomorrow }
        }).lean() || {};

        const upcomingClass = user.class_schedules.find(c => {
            const classDate = new Date(c.date);
            return classDate >= today;
        }) || null;
        if (upcomingClass) {
            upcomingClass.trainerName = user.trainer?.full_name || 'Coach';
        }

        // Fetch exercise progress dynamically from WorkoutHistory
        const exercisesToTrack = ['Bicep Curls', 'Deadlift', 'Bench Press'];
        const exerciseProgress = await Promise.all(exercisesToTrack.map(async (exerciseName) => {
            const workoutHistories = await WorkoutHistory.find({
                userId: userId,
                'exercises.name': exerciseName
            })
                .sort({ date: 1 }) // Sort by date ascending
                .lean();

            const history = [];
            let currentWeight = 0;
            const goalWeight = {
                'Bicep Curls': 12,
                'Deadlift': 140,
                'Bench Press': 100
            }[exerciseName];

            workoutHistories.forEach((wh, index) => {
                const exercise = wh.exercises.find(ex => ex.name === exerciseName);
                if (exercise && exercise.weight) {
                    currentWeight = exercise.weight;
                    history.push({
                        week: `Week ${index + 1}`,
                        weight: exercise.weight,
                        date: wh.date
                    });
                }
            });

            // Fill in missing weeks if necessary
            while (history.length < 6) {
                history.unshift({
                    week: `Week ${history.length + 1}`,
                    weight: 0,
                    date: new Date(today.getTime() - (6 - history.length) * 24 * 60 * 60 * 1000)
                });
            }

            return {
                name: exerciseName,
                currentWeight: currentWeight || 0,
                goalWeight: goalWeight || 0,
                progress: goalWeight ? Math.round((currentWeight / goalWeight) * 100) : 0,
                history: history.slice(-6), // Last 6 entries
                color: {
                    'Bicep Curls': '#8A2BE2',
                    'Deadlift': '#32CD32',
                    'Bench Press': '#FF6347'
                }[exerciseName]
            };
        }));

        const recommendedFoods = [
            { name: 'Grilled Chicken Breast', protein: 31, perUnit: '100g', icon: 'fa-drumstick-bite' },
            { name: 'Whole Eggs', protein: 13, perUnit: '2 eggs', icon: 'fa-egg' },
            { name: 'Tofu (Firm)', protein: 20, perUnit: '100g', icon: 'fa-seedling' },
            { name: 'Salmon', protein: 25, perUnit: '100g', icon: 'fa-fish' }
        ];

        res.render('userdashboard_p', {
            user,
            todayWorkout: workoutData,
            weeklyWorkouts,
            todayNutrition,
            upcomingClass,
            exerciseProgress,
            recommendedFoods
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

const completeWorkout = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            console.log('No user session found');
            return res.status(401).json({ error: 'Please log in to complete the workout' });
        }

        const userId = req.session.user.id;
        const { workoutPlanId } = req.body; // This is actually the WorkoutHistory _id

        if (!workoutPlanId) {
            console.log('Missing workoutPlanId');
            return res.status(400).json({ error: 'Workout ID is required' });
        }

        console.log('Completing workout for user:', userId, 'Workout ID:', workoutPlanId);

        const workout = await WorkoutHistory.findOne({ _id: workoutPlanId, userId: userId });
        if (!workout) {
            console.log('Workout not found:', workoutPlanId);
            return res.status(404).json({ error: 'Workout not found' });
        }

        if (workout.completed) {
            console.log('Workout already completed:', workoutPlanId);
            return res.status(400).json({ error: 'Workout already completed' });
        }

        workout.completed = true;
        workout.progress = 100;
        workout.exercises.forEach(exercise => {
            exercise.completed = true;
        });

        await workout.save();
        console.log('Workout completed successfully:', workoutPlanId);

        res.status(200).json({ message: 'Workout completed successfully' });
    } catch (error) {
        console.error('Error completing workout:', error);
        res.status(500).json({ error: 'Server error' });
    }
};


module.exports = {
    loginUser,
    signupUser,
    getUserDashboard,
    completeWorkout
};