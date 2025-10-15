const bcrypt = require('bcryptjs');
const User = require('../model/User');
const WorkoutPlan = require('../model/WorkoutPlan');
const WorkoutHistory = require('../model/WorkoutHistory');
const NutritionHistory = require('../model/NutritionHistory');
//brimstone
const Membership = require('../model/Membership'); // Add this line
//brimstone
// for membership management           REYNA
const Trainer = require('../model/Trainer');

const checkMembershipActive = async (req, res, next) => {
    try {
        if (!req.session.user) {
            return next();
        }

        const user = await User.findById(req.session.user.id);
        if (user && !user.isMembershipActive()) {
            // Redirect to renewal page if membership expired
            return res.redirect('/membership/renewal');
        }

        next();
    } catch (error) {
        console.error('Membership check error:', error);
        next();
    }
};

const checkTrainerSubscription = async (req, res, next) => {
    try {
        if (!req.session.trainer) {
            return next();
        }

        const trainer = await Trainer.findById(req.session.trainer.id);
        if (trainer && trainer.subscription.months_remaining === 0) {
            return res.redirect('/trainer/subscription/renewal');
        }

        next();
    } catch (error) {
        console.error('Trainer subscription check error:', error);
        next();
    }
};

const getUserProfile = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            console.log('No user session found');
            return res.redirect('/login_signup?form=login');
        }
        const userId = req.session.user.id;
        
        console.log('Fetching user profile data for:', userId);
        
        // Fetch user data and populate trainer
        const user = await User.findById(userId)
            .populate('trainer');
            
        if (!user) {
            console.log('User not found:', userId);
            return res.status(404).json({ error: 'User not found' });
        }
        req.session.user.membershipDuration = {
            months_remaining: user.membershipDuration.months_remaining,
            end_date: user.membershipDuration.end_date,
            auto_renew: user.membershipDuration.auto_renew
        };
        
        // Fetch workout history and populate workoutPlanId
        const workoutHistoryData = await WorkoutHistory.find({ userId })
            .populate('workoutPlanId')
            .sort({ date: -1 }) // Most recent first
            .lean();
        
        // Format workout history for display
        const workoutHistory = workoutHistoryData.map(workout => ({
            id: workout._id,
            name: workout.workoutPlanId?.name || 'Unnamed Workout',
            date: workout.date,
            exercises: workout.exercises || [],
            progress: workout.progress || 0,
            completed: workout.completed || false
        }));
        
        // Fetch nutrition history
        const nutritionHistoryData = await NutritionHistory.find({ userId })
            .sort({ date: -1 })
            .lean();
        
        // Calculate fitness statistics
        const today = new Date();
        const oneMonthAgo = new Date(today);
        oneMonthAgo.setMonth(today.getMonth() - 1);
        
        let workoutsCompleted = 0;
        let caloriesBurned = 0;
        let hoursActive = 0;
        let goalsAchieved = 0;
        
        // Calculate workout statistics
        workoutsCompleted = workoutHistoryData.filter(w => 
            new Date(w.date) >= oneMonthAgo && 
            new Date(w.date) <= today &&
            w.completed
        ).length;
        
        workoutHistoryData.forEach(workout => {
            if (new Date(workout.date) >= oneMonthAgo && 
                new Date(workout.date) <= today &&
                workout.completed) {
                if (workout.exercises && workout.exercises.length > 0) {
                    workout.exercises.forEach(exercise => {
                        const reps = exercise.reps || 0;
                        const sets = exercise.sets || 0;
                        caloriesBurned += (reps * sets * 5);
                    });
                }
            }
        });
        
        hoursActive = workoutHistoryData.reduce((total, workout) => {
            if (new Date(workout.date) >= oneMonthAgo && 
                new Date(workout.date) <= today &&
                workout.completed) {
                return total + 1;
            }
            return total;
        }, 0);
        
        const totalWorkoutsInPeriod = workoutHistoryData.filter(w => 
            new Date(w.date) >= oneMonthAgo && 
            new Date(w.date) <= today
        ).length;
        
        if (totalWorkoutsInPeriod > 0 && (workoutsCompleted / totalWorkoutsInPeriod) >= 0.8) {
            goalsAchieved++;
        }
        
        // Calculate nutrition statistics
        nutritionHistoryData.forEach(entry => {
            if (new Date(entry.date) >= oneMonthAgo && 
                new Date(entry.date) <= today) {
                if (entry.calories_consumed) {
                    caloriesBurned += Math.round(entry.calories_consumed * 0.3);
                }
            }
        });
        
        if (nutritionHistoryData.length > 0 && user.fitness_goals) {
            const nutritionEntries = nutritionHistoryData.filter(entry => 
                new Date(entry.date) >= oneMonthAgo && 
                new Date(entry.date) <= today
            );
            
            if (nutritionEntries.length > 0) {
                const avgProtein = nutritionEntries.reduce((sum, entry) => 
                    sum + (entry.protein_consumed || 0), 0) / nutritionEntries.length;
                    
                if (avgProtein >= (user.fitness_goals.protein_goal || 0)) {
                    goalsAchieved++;
                }
                
                const avgCalories = nutritionEntries.reduce((sum, entry) => 
                    sum + (entry.calories_consumed || 0), 0) / nutritionEntries.length;
                    
                if (user.fitness_goals.calorie_goal && avgCalories <= user.fitness_goals.calorie_goal) {
                    goalsAchieved++;
                }
            }
        }
        
        // Generate weekly workout data for chart (last 4 weeks)
        const weeklyWorkoutData = [];
        const weekLabels = [];
        
        for (let i = 0; i < 4; i++) {
            const weekEnd = new Date(today);
            weekEnd.setDate(today.getDate() - (i * 7));
            const weekStart = new Date(weekEnd);
            weekStart.setDate(weekEnd.getDate() - 7);
            
            const weeklyCount = workoutHistoryData.filter(w => 
                new Date(w.date) >= weekStart && 
                new Date(w.date) < weekEnd &&
                w.completed
            ).length;
            
            const startMonth = weekStart.toLocaleString('default', { month: 'short' });
            const endMonth = weekEnd.toLocaleString('default', { month: 'short' });
            const weekLabel = startMonth === endMonth ? 
                `${startMonth} ${weekStart.getDate()}-${weekEnd.getDate()}` :
                `${startMonth} ${weekStart.getDate()}-${endMonth} ${weekEnd.getDate()}`;
            
            weeklyWorkoutData.unshift(weeklyCount);
            weekLabels.unshift(weekLabel);
        }
        
        // Generate weight progress data
        const weightProgress = [];
        const sortedWorkouts = workoutHistoryData
            .filter(w => w.exercises && w.exercises.some(e => e.weight))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
            
        if (sortedWorkouts.length >= 4) {
            for (let i = 0; i < 4; i++) {
                const index = Math.floor((sortedWorkouts.length - 4 + i) * (sortedWorkouts.length / 4));
                const workout = sortedWorkouts[Math.min(index, sortedWorkouts.length - 1)];
                const maxWeight = workout.exercises.reduce((max, ex) => 
                    ex.weight > max ? ex.weight : max, 0);
                    
                const date = new Date(workout.date);
                const weekLabel = `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}`;
                
                weightProgress.push({
                    week: weekLabel,
                    weight: maxWeight
                });
            }
        } else if (user.weight) {
            for (let i = 0; i < 4; i++) {
                const weekNumber = i + 1;
                weightProgress.push({
                    week: `Week ${weekNumber}`,
                    weight: user.weight
                });
            }
        } else {
            for (let i = 0; i < 4; i++) {
                const weekNumber = i + 1;
                weightProgress.push({
                    week: `Week ${weekNumber}`,
                    weight: 70
                });
            }
        }
        
        const fitnessStats = {
            workoutsCompleted,
            caloriesBurned,
            hoursActive,
            goalsAchieved
        };
        
        const chartData = {
            weeklyWorkouts: weeklyWorkoutData,
            weekLabels,
            weightProgress
        };
        
        res.render('userprofile', { 
            user,
            workoutHistory,
            fitnessStats,
            chartData,
            currentPage: 'profile'
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Server error' });
    }
};


const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('Login request received:', { email});

        if (!email || !password) {
            console.log('Validation failed: Missing fields');
            return res.status(400).json({ error: 'All fields are required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            console.log('User not found:', email);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            console.log('Password mismatch for:', email);
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        //brimstone 1
        // if (user.membershipType.toLowerCase() !== loginMembershipPlan.toLowerCase()) {
        //     console.log('Membership plan mismatch:', { user: user.membershipType, input: loginMembershipPlan });
        //     return res.status(400).json({ error: 'Selected membership plan does not match user membership' });
        // }
        // brimstone
        if (!req.session) {
            console.error('Session middleware not initialized');
            return res.status(500).json({ error: 'Session not available. Please try again later.' });
        }

        req.session.user = {
            id: user._id,
            email: user.email,
            full_name: user.full_name,
            name: user.full_name,
            membershipType: user.membershipType,
            membership: user.membershipType.toLowerCase(),
            phone: user.phone,
            dob: user.dob,
            gender: user.gender,
            weight: user.weight,
            height: user.height,
            BMI: user.BMI,
            status: user.status,
            created_at: user.created_at,

            // REYNA
            workout_type: user.workout_type,
            membershipDuration: {
                months_remaining: user.membershipDuration.months_remaining,
                end_date: user.membershipDuration.end_date,
                auto_renew: user.membershipDuration.auto_renew
            },
            fitness_goals: {
                calorie_goal: user.fitness_goals?.calorie_goal || 2200,
                protein_goal: user.fitness_goals?.protein_goal || 90,
                weight_goal: user.fitness_goals?.weight_goal || null
            }
        };

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
                redirectUrl = '/userdashboard_b'; // Default to basic dashboard
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
            height,
            // REYNA
            workoutType,
            weightGoal
        } = req.body;

        console.log('Signup request received:', {
            userFullName, dateOfBirth, gender, userEmail, phoneNumber,
            membershipPlan, membershipDuration, cardType, cardNumber,
            expirationDate, cvv, terms, weight, height,workoutType, weightGoal
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
            weight === undefined||
            !workoutType ||        // ADD THIS VALIDATION
            weightGoal === undefined
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
        const validWorkoutTypes = ['Calisthenics', 'Weight Loss', 'HIIT', 'Competitive', 'Strength Training', 'Cardio', 'Flexibility', 'Bodybuilding'];
        if (!validWorkoutTypes.includes(workoutType)) {
            console.log('Validation failed: Invalid workout type:', workoutType);
            return res.status(400).json({ error: 'Please select a valid workout type' });
        }

        if (isNaN(weightGoal) || weightGoal < 20 || weightGoal > 300) {
            console.log('Validation failed: Invalid weight goal:', weightGoal);
            return res.status(400).json({ error: 'Weight goal must be between 20 and 300 kg' });
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

        // REYNA
        // Add validation for workoutType
        if (!workoutType) {
            console.log('Validation failed: Workout type is required');
            return res.status(400).json({ error: 'Please select your preferred workout type' });
        }

        if (weightGoal === undefined) {
            console.log('Validation failed: Weight goal is required');
            return res.status(400).json({ error: 'Weight goal is required' });
        }

        if (isNaN(weightGoal) || weightGoal < 20 || weightGoal > 300) {
            console.log('Validation failed: Invalid weight goal:', weightGoal);
            return res.status(400).json({ error: 'Weight goal must be between 20 and 300 kg' });
        }
        // end REYNA

        const existingUser = await User.findOne({ email: userEmail });
        if (existingUser) {
            console.log('Validation failed: Email already registered:', userEmail);
            return res.status(400).json({ error: 'Email already registered' });
        }

        const saltRounds = 10;
        const password_hash = await bcrypt.hash(userPassword, saltRounds);
        console.log('Password hashed for:', userEmail);


        // Calculate end date based on membership duration           REYNA
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + parseInt(membershipDuration));


        const newUser = new User({
            full_name: userFullName,
            email: userEmail,
            password_hash,
            dob: new Date(dateOfBirth),
            gender: gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase(),
            phone: phoneNumber,
            membershipType: membershipPlan.charAt(0).toUpperCase() + membershipPlan.slice(1).toLowerCase(),
           
            // REYNA
            workout_type: workoutType,
            // ADD FITNESS GOALS WITH WEIGHT GOAL:
            fitness_goals: {
                calorie_goal: 2200,
                protein_goal: 90,
                weight_goal: Number(weightGoal)  // ADD THIS
            },

            // NEW: Add membership duration data          REYNA
            membershipDuration: {
                months_remaining: parseInt(membershipDuration),
                start_date: startDate,
                end_date: endDate,
                auto_renew: false,
                last_renewal_date: startDate
            },

            weight: Number(weight),
            height: height !== undefined ? Number(height) : null,
            BMI: calculatedBMI,
            //REYNA
            workout_type: workoutType 
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
                name: newUser.full_name,
                membershipType: newUser.membershipType,
                membership: newUser.membershipType.toLowerCase()
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

// Add this function to userController.js for individual exercise completion
const markExerciseCompleted = async (req, res) => {
    try {
        console.log('🔍=== MARK EXERCISE COMPLETED START ===');
        console.log('Request body:', req.body);
        console.log('Session user:', req.session.user);
        
        if (!req.session || !req.session.user) {
            console.log('❌ No user session');
            return res.status(401).json({ error: 'Please log in to complete the exercise' });
        }

        const userId = req.session.user.id;
        const { workoutPlanId, exerciseName } = req.body;

        console.log('📝 Processing:', { workoutPlanId, exerciseName, userId });

        if (!workoutPlanId || !exerciseName) {
            console.log('❌ Missing required fields');
            return res.status(400).json({ error: 'Workout ID and exercise name are required' });
        }

        // ✅ ADD THIS: Calculate today's day name
        // In markExerciseCompleted function - add timezone handling:
const today = new Date();
// Convert to Asia/Kolkata timezone (UTC+5:30)
const localDate = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
const todayDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][localDate.getDay()];
console.log('📅 Today is (local):', todayDayName);

        // Find the workout
        console.log('🔍 Looking for workout:', workoutPlanId);
        const workout = await WorkoutHistory.findOne({ _id: workoutPlanId, userId });
        
        if (!workout) {
            console.log('❌ Workout not found');
            return res.status(404).json({ error: 'Workout not found' });
        }

        console.log('✅ Workout found:', {
            id: workout._id,
            exerciseCount: workout.exercises.length,
            exercises: workout.exercises.map(e => ({ name: e.name, day: e.day, completed: e.completed }))
        });

        // Find exercise by exact name match
        const exerciseIndex = workout.exercises.findIndex(ex => ex.name === exerciseName);
        
        if (exerciseIndex === -1) {
            console.log('❌ Exercise not found:', exerciseName);
            console.log('📝 Available exercises:', workout.exercises.map(e => e.name));
            return res.status(404).json({ error: `Exercise "${exerciseName}" not found` });
        }

        const exercise = workout.exercises[exerciseIndex];
        console.log('✅ Found exercise:', {
            name: exercise.name,
            day: exercise.day,
            currentCompleted: exercise.completed,
            index: exerciseIndex
        });

        if (exercise.completed) {
            console.log('⚠️ Exercise already completed');
            return res.status(400).json({ error: 'Exercise already completed' });
        }

        // Mark as completed
        workout.exercises[exerciseIndex].completed = true;
        console.log('✅ Marked exercise as completed');

        // ✅ FIXED: Calculate progress for TODAY'S exercises only
        const todaysExercises = workout.exercises.filter(ex => ex.day === todayDayName);
        const completedExercises = todaysExercises.filter(ex => ex.completed).length;
        const totalExercises = todaysExercises.length;
        const progress = Math.round((completedExercises / totalExercises) * 100);

        console.log('📊 Progress calculated (TODAY ONLY):', { 
            today: todayDayName,
            completed: completedExercises, 
            total: totalExercises, 
            progress,
            todaysExercises: todaysExercises.map(e => ({ name: e.name, completed: e.completed }))
        });

        workout.progress = progress;

        // Save to database
        console.log('💾 Saving to database...');
        await workout.save();
        
        // Verify the save worked
        const updatedWorkout = await WorkoutHistory.findById(workoutPlanId);
        const savedExercise = updatedWorkout.exercises[exerciseIndex];
        console.log('💾 After save - exercise completed:', savedExercise.completed);

        console.log('✅=== MARK EXERCISE COMPLETED SUCCESS ===');
        
        res.json({ 
            success: true,
            message: 'Exercise marked as completed successfully',
            progress: progress,
            completedExercises: completedExercises,
            totalExercises: totalExercises
        });

    } catch (error) {
        console.error('❌=== MARK EXERCISE COMPLETED ERROR ===');
        console.error('Error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Server error: ' + error.message 
        });
    }
};




//brimstone
// Add this function to userController.js
const changeMembership = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const userId = req.session.user.id;
        const { newMembershipType, duration, amount, cardLastFour } = req.body;

        console.log('Changing membership for user:', userId, 'Data:', req.body);

        // Validate input
        if (!newMembershipType || !duration || !amount) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Validate membership type
        const validMembershipTypes = ['Basic', 'Gold', 'Platinum'];
        if (!validMembershipTypes.includes(newMembershipType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid membership type'
            });
        }

        // Validate duration
        const validDurations = [1, 3, 6];
        if (!validDurations.includes(duration)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid duration'
            });
        }

        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }


        // Calculate new membership duration
        const newMonthsRemaining = duration;

        // Update user membership - PRESERVE EXISTING FITNESS GOALS
        user.membershipType = newMembershipType;
        user.membershipDuration.months_remaining = newMonthsRemaining;
        user.membershipDuration.last_renewal_date = new Date();
        
        // Update end date
        const newEndDate = new Date();
        newEndDate.setMonth(newEndDate.getMonth() + newMonthsRemaining);
        user.membershipDuration.end_date = newEndDate;
        
        user.status = 'Active';

        // Ensure fitness_goals are preserved and not set to null
        if (!user.fitness_goals) {
            user.fitness_goals = {
                calorie_goal: 2200,
                protein_goal: 90,
                weight_goal: user.weight || 70 // Use current weight as default if no goal exists
            };
        } else if (user.fitness_goals.weight_goal === null || user.fitness_goals.weight_goal === undefined) {
            // Set a default weight goal if it's null/undefined
            user.fitness_goals.weight_goal = user.weight || 70;
        }

        // Create membership record
        const membershipRecord = new Membership({
            user_id: userId,
            plan: newMembershipType.toLowerCase(),
            duration: duration,
            start_date: new Date(),
            end_date: newEndDate,
            price: amount,
            payment_method: 'credit_card',
            card_last_four: cardLastFour,
            status: 'Active'
        });

        // Save both user and membership record
        await Promise.all([
            user.save(),
            membershipRecord.save()
        ]);

        // Update session
        req.session.user.membershipType = newMembershipType;
        req.session.user.membership = newMembershipType.toLowerCase();
        req.session.user.membershipDuration = {
            months_remaining: newMonthsRemaining,
            end_date: newEndDate,
            auto_renew: user.membershipDuration.auto_renew
        };

        console.log('Membership changed successfully for user:', userId);

        res.json({
            success: true,
            message: 'Membership changed successfully',
            newMembershipType: newMembershipType,
            monthsRemaining: newMonthsRemaining,
            redirect: `/userdashboard_${newMembershipType.charAt(0).toLowerCase()}`
        });

    } catch (error) {
        console.error('Error changing membership:', error);
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: errors
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};
//brimstone
// brimstone
// Add this function to userController.js
const updateUserProfile = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const userId = req.session.user.id;
        const { full_name, email, phone, dob, height, weight } = req.body;

        console.log('Updating profile for user:', userId, 'Data:', req.body);

        // Validate required fields
        if (!full_name || !email) {
            return res.status(400).json({
                success: false,
                message: 'Name and email are required fields'
            });
        }

        // Validate email format
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address'
            });
        }

        // Validate phone format
        const phoneRegex = /^\+?[\d\s-]{10,}$/;
        if (phone && !phoneRegex.test(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid phone number'
            });
        }

        // Calculate BMI if height and weight are provided
        let BMI = null;
        if (height && weight && height > 0) {
            const heightInMeters = height / 100;
            BMI = (weight / (heightInMeters * heightInMeters)).toFixed(1);
        }

        // Prepare update data
        const updateData = {
            full_name,
            email,
            phone,
            height: height ? Number(height) : null,
            weight: weight ? Number(weight) : null,
            BMI: BMI ? Number(BMI) : null
        };

        // Only add dob if provided and valid
        if (dob) {
            const dobDate = new Date(dob);
            if (!isNaN(dobDate.getTime())) {
                updateData.dob = dobDate;
            }
        }

        // Remove undefined/null fields
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined || updateData[key] === null) {
                delete updateData[key];
            }
        });

        console.log('Update data:', updateData);

        // Update user in database
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { 
                new: true, // Return updated document
                runValidators: true // Run schema validators
            }
        );

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update session data
        req.session.user = {
            ...req.session.user,
            full_name: updatedUser.full_name,
            email: updatedUser.email,
            phone: updatedUser.phone,
            dob: updatedUser.dob,
            height: updatedUser.height,
            weight: updatedUser.weight,
            BMI: updatedUser.BMI
        };

        console.log('Profile updated successfully for user:', userId);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: updatedUser,
            BMI: BMI
        });

    } catch (error) {
        console.error('Error updating profile:', error);
        
        // Handle duplicate email error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        // Handle validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: errors
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};
// Update the getUserDashboard function in userController.js to fetch nutrition data:
// brimstone
// Get user dashboard based on membership type
const getUserDashboard = async (req, res, membershipCode) => {
    try {
        if (!req.session || !req.session.user) {
            return res.redirect('/login_signup?form=login');
        }

        const userId = req.session.user.id;

        // ✅ PERMANENT FIX: Use local time consistently
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        console.log('✅ Local Today:', today.toString());

        const todaysConsumedFoods = await getTodaysFoods(userId);
        console.log('🎯 Final todaysConsumedFoods to display:', todaysConsumedFoods.length);

        const user = await User.findById(userId)
            .populate('trainer', 'name email specializations experience')
            .populate('class_schedules.trainerId', 'name');
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Check if membership is active - REYNA
        if (!user.isMembershipActive()) {
            return res.redirect('/membership/renewal');
        }
        
        // Determine dashboard template based on membership code
        let dashboardTemplate;
        switch(membershipCode) {
            case 'p':
                dashboardTemplate = 'userdashboard_p';
                break;
            case 'g':
                dashboardTemplate = 'userdashboard_g';
                break;
            default:
                dashboardTemplate = 'userdashboard_b';
        }
        
        // Get last 5 workouts
        const recentWorkouts = await WorkoutHistory.find({ userId: userId })
            .populate('workoutPlanId')
            .sort({ date: -1 })
            .limit(5);
            
        // ✅ PERMANENT FIX: Use local time for day calculation
        const todayDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()];
        
        // Calculate week start (Sunday) using local time
        const weekStart = new Date(today);
        const dayOfWeek = today.getDay();
        weekStart.setDate(today.getDate() - dayOfWeek);
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        console.log('✅ Local Week Range:', weekStart.toString(), 'to', weekEnd.toString());

        // Get the weekly nutrition data
        const weeklyNutritionEntry = await NutritionHistory.findOne({
            userId: userId,
            date: { $gte: weekStart, $lt: weekEnd }
        });

        // Extract today's nutrition data from the weekly plan
        let todayNutrition = { 
            calories_consumed: 0, 
            protein_consumed: 0,
            calorie_goal: user.fitness_goals.calorie_goal,
            protein_goal: user.fitness_goals.protein_goal,
            macros: { protein: 0, carbs: 0, fats: 0 }
        };

        if (weeklyNutritionEntry) {
            const todayData = weeklyNutritionEntry.daily_nutrition[todayDayName];
            
            if (todayData) {
                console.log('🔍 Today Data from DB:', {
                    calories_consumed: todayData.calories_consumed,
                    protein_consumed: todayData.protein_consumed,
                    foods_count: todayData.foods ? todayData.foods.length : 0,
                    consumed_foods: todayData.foods ? todayData.foods.filter(f => f.consumed).length : 0
                });
                
                // ✅ FIX: Always use the stored consumed values from the database
                todayNutrition = {
                    calories_consumed: todayData.calories_consumed || 0,
                    protein_consumed: todayData.protein_consumed || 0,
                    calorie_goal: weeklyNutritionEntry.calorie_goal || user.fitness_goals.calorie_goal,
                    protein_goal: weeklyNutritionEntry.protein_goal || user.fitness_goals.protein_goal,
                    macros: todayData.macros || { protein: 0, carbs: 0, fats: 0 }
                };
                
                console.log('📊 Today Nutrition - Final:', {
                    calories: todayNutrition.calories_consumed,
                    protein: todayNutrition.protein_consumed,
                    goalCalories: todayNutrition.calorie_goal,
                    goalProtein: todayNutrition.protein_goal
                });
            } else {
                console.log('❌ No data found for today:', todayDayName);
                console.log('Available days:', Object.keys(weeklyNutritionEntry.daily_nutrition || {}));
            }
        } else {
            console.log('❌ No weekly nutrition entry found for this week');
        }

        console.log('📊 Today Nutrition Data:', todayNutrition);
        console.log('📅 Today Day:', todayDayName);
        
        // Get last 7 days nutrition data for weekly stats (using local time)
        const weekStartDate = new Date(today);
        weekStartDate.setDate(today.getDate() - 7);
        
        const weeklyNutrition = await NutritionHistory.find({
            userId: userId,
            date: { $gte: weekStartDate }
        }).sort({ date: 1 });
        
        // Format nutrition data for the chart
        const nutritionChartData = {
            labels: [],
            calories: [],
            protein: []
        };
        
        // Create array of last 7 dates (local time)
        const dateLabels = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            dateLabels.push(date);
        }
        
        // Format dates as labels and find matching nutrition data
        dateLabels.forEach(date => {
            const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            nutritionChartData.labels.push(dateString);
            
            const dayData = weeklyNutrition.find(entry => {
                const entryDate = new Date(entry.date);
                return entryDate.getDate() === date.getDate() && 
                       entryDate.getMonth() === date.getMonth() && 
                       entryDate.getFullYear() === date.getFullYear();
            });
            
            nutritionChartData.calories.push(dayData ? dayData.calories_consumed || 0 : 0);
            nutritionChartData.protein.push(dayData ? dayData.protein_consumed || 0 : 0);
        });
        
        // Get recent foods function
        const getRecentFoods = async (userId, limit = 10) => {
            try {
                console.log('🔍 Fetching recent foods for user:', userId);
                
                // Get nutrition entries from last 30 days (local time)
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                
                const nutritionEntries = await NutritionHistory.find({ 
                    userId: userId,
                    date: { $gte: thirtyDaysAgo }
                })
                .sort({ date: -1 })
                .limit(10);

                console.log('📊 Found nutrition entries:', nutritionEntries.length);

                let foods = [];
                
                nutritionEntries.forEach((entry, index) => {
                    console.log(`📅 Processing entry ${index + 1}:`, entry.date);
                    
                    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                    days.forEach(day => {
                        if (entry.daily_nutrition && 
                            entry.daily_nutrition[day] && 
                            entry.daily_nutrition[day].foods && 
                            entry.daily_nutrition[day].foods.length > 0) {
                            
                            console.log(`🍽️ Found ${entry.daily_nutrition[day].foods.length} foods for ${day}`);
                            
                            entry.daily_nutrition[day].foods.forEach(food => {
                                if (food.name && food.calories) {
                                    foods.push({
                                        name: food.name,
                                        calories: food.calories,
                                        protein: food.protein || 0,
                                        carbs: food.carbs || 0,
                                        fats: food.fats || 0,
                                        date: entry.date,
                                        day: day
                                    });
                                }
                            });
                        }
                    });
                });

                console.log('🎯 Total foods collected:', foods.length);
                
                // Sort by date (most recent first) and limit
                const sortedFoods = foods.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);
                
                console.log('✅ Final recent foods to display:', sortedFoods.length);
                sortedFoods.forEach((food, index) => {
                    console.log(`${index + 1}. ${food.name} - ${food.calories} kcal - ${food.day} - ${new Date(food.date).toLocaleDateString()}`);
                });
                
                return sortedFoods;
            } catch (error) {
                console.error('❌ Error getting recent foods:', error);
                return [];
            }
        };

        const recentFoods = await getRecentFoods(userId, 10);
        
        // Calculate nutrition stats
        const calorieAvg = weeklyNutrition.length > 0 
            ? weeklyNutrition.reduce((sum, entry) => sum + (entry.calories_consumed || 0), 0) / weeklyNutrition.length 
            : 0;
            
        const proteinAvg = weeklyNutrition.length > 0 
            ? weeklyNutrition.reduce((sum, entry) => sum + (entry.protein_consumed || 0), 0) / weeklyNutrition.length 
            : 0;
        
        // Calculate macros percentages if available
        let macrosData = { protein: 0, carbs: 0, fats: 0 };
        if (todayNutrition.macros) {
            macrosData = todayNutrition.macros;
        } else if (weeklyNutrition.length > 0) {
            const macrosEntries = weeklyNutrition.filter(entry => entry.macros);
            if (macrosEntries.length > 0) {
                macrosData = {
                    protein: macrosEntries.reduce((sum, entry) => sum + (entry.macros.protein || 0), 0) / macrosEntries.length,
                    carbs: macrosEntries.reduce((sum, entry) => sum + (entry.macros.carbs || 0), 0) / macrosEntries.length,
                    fats: macrosEntries.reduce((sum, entry) => sum + (entry.macros.fats || 0), 0) / macrosEntries.length
                };
            }
        }

        // ✅ FIXED: Get today's workout (Week starts from Monday)
       // ✅ FIXED: Get today's workout with better debugging
// ✅ FIXED: Get today's workout with proper progress calculation for TODAY ONLY
// ✅ FIXED: Get today's workout with proper timezone handling
const getTodaysWorkout = async (userId) => {
    try {
        // ✅ Use local time instead of UTC for day calculation
        const today = new Date();
        // Convert to Asia/Kolkata timezone (UTC+5:30)
        const localDate = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        const todayDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][localDate.getDay()];
        
        console.log('🔍 Looking for workouts for:', todayDayName, 'User:', userId);
        console.log('📅 Date info:', {
            utc: today.toISOString(),
            local: localDate.toString(),
            localDay: todayDayName
        });

        // Look for ANY workout history that has exercises for today
        const workouts = await WorkoutHistory.find({ 
            userId: userId 
        }).lean();

        console.log('📋 Total workouts found:', workouts.length);

        let todaysExercises = [];
        let workoutPlanId = null;
        let workoutName = `${todayDayName} Workout`;

        // Check each workout for today's exercises
        for (const workout of workouts) {
            if (workout.exercises && workout.exercises.length > 0) {
                const exercisesForToday = workout.exercises.filter(ex => 
                    ex.day === todayDayName
                );
                
                if (exercisesForToday.length > 0) {
                    console.log('✅ Found workout with exercises for today:', workout._id);
                    todaysExercises = exercisesForToday;
                    workoutPlanId = workout._id;
                    workoutName = workout.name || `${todayDayName} Workout`;
                    break;
                }
            }
        }

        console.log('🎯 Today exercises found:', todaysExercises.length);

        if (todaysExercises.length > 0) {
            const completedExercises = todaysExercises.filter(ex => ex.completed).length;
            const totalExercises = todaysExercises.length;
            const progress = Math.round((completedExercises / totalExercises) * 100);
            
            console.log('📊 Progress calculation (TODAY ONLY):', {
                completed: completedExercises,
                total: totalExercises,
                progress: progress,
                todayDayName: todayDayName
            });
            
            return {
                name: workoutName,
                exercises: todaysExercises,
                progress: progress,
                completed: completedExercises === totalExercises,
                completedExercises: completedExercises,
                totalExercises: totalExercises,
                duration: todaysExercises.reduce((total, ex) => total + (ex.duration || 45), 0),
                workoutPlanId: workoutPlanId
            };
        }

        // If no workouts found, return empty
        console.log('❌ No workouts found for today');
        return {
            name: 'No Workout Scheduled',
            exercises: [],
            progress: 0,
            completed: false,
            completedExercises: 0,
            totalExercises: 0,
            duration: 0,
            workoutPlanId: null
        };

    } catch (error) {
        console.error('❌ Error in getTodaysWorkout:', error);
        return {
            name: 'No Workout Scheduled',
            exercises: [],
            progress: 0,
            completed: false,
            completedExercises: 0,
            totalExercises: 0,
            duration: 0,
            workoutPlanId: null
        };
    }
};


        // ✅ USE the function to get today's workout
        const todayWorkoutData = await getTodaysWorkout(userId);
        console.log('✅ Today workout data:', todayWorkoutData);


        // Update exercise progress with actual workout data
        let exerciseProgress = [
            { name: 'Bench Press', progress: 75, currentWeight: 80, goalWeight: 100 },
            { name: 'Squat', progress: 60, currentWeight: 90, goalWeight: 120 },
            { name: 'Deadlift', progress: 85, currentWeight: 110, goalWeight: 130 }
        ];

        // Use today's workout data to update exercise progress
        if (todayWorkoutData.exercises.length > 0) {
            const exercises = todayWorkoutData.exercises;
            
            const benchPressExercises = exercises.filter(ex => ex.name && ex.name.toLowerCase().includes('bench'));
            if (benchPressExercises.length > 0) {
                const maxBench = Math.max(...benchPressExercises.map(ex => ex.weight || 0));
                exerciseProgress[0].currentWeight = maxBench;
                exerciseProgress[0].progress = Math.round((maxBench / 100) * 100);
            }
            
            const squatExercises = exercises.filter(ex => ex.name && ex.name.toLowerCase().includes('squat'));
            if (squatExercises.length > 0) {
                const maxSquat = Math.max(...squatExercises.map(ex => ex.weight || 0));
                exerciseProgress[1].currentWeight = maxSquat;
                exerciseProgress[1].progress = Math.round((maxSquat / 120) * 100);
            }
            
            const deadliftExercises = exercises.filter(ex => ex.name && ex.name.toLowerCase().includes('deadlift'));
            if (deadliftExercises.length > 0) {
                const maxDeadlift = Math.max(...deadliftExercises.map(ex => ex.weight || 0));
                exerciseProgress[2].currentWeight = maxDeadlift;
                exerciseProgress[2].progress = Math.round((maxDeadlift / 130) * 100);
            }
        }

        // ✅ UTC: Get upcoming class
        const upcomingClass = user.class_schedules && user.class_schedules.length > 0
            ? user.class_schedules
                .filter(cls => {
                    const classDate = new Date(cls.date);
                    const now = new Date();
                    return classDate >= now;
                })
                .sort((a, b) => new Date(a.date) - new Date(b.date))[0]
            : null;

        console.log('=== DEBUG DASHBOARD DATA ===');
        console.log('Recent workouts:', recentWorkouts.length);
        console.log('Today workout exercises:', todayWorkoutData.exercises.length);
        console.log('Recent foods:', recentFoods.length);
        // Debug section
        console.log('=== DEBUG WORKOUT DATA (LOCAL) ===');
        console.log('Local Today:', today.toString());
        console.log('Local Today Day Name:', todayDayName);
        console.log('Local Week Start:', weekStart.toString());
        console.log('Local Week End:', weekEnd.toString());
        

        console.log('=== DEBUG RECENT FOODS ===');
        console.log('Recent foods count:', recentFoods.length);

        // Common data for all membership types
        const commonData = {
            user: user,
            recentWorkouts: recentWorkouts,
            todayNutrition: todayNutrition,
            weeklyWorkouts: {
                completed: recentWorkouts.filter(w => w.completed).length,
                total: recentWorkouts.length
            },
            todayWorkout: todayWorkoutData,
            exerciseProgress: exerciseProgress,
            membershipInfo: {
                months_remaining: user.membershipDuration.months_remaining,
                end_date: user.membershipDuration.end_date,
                auto_renew: user.membershipDuration.auto_renew,
                is_active: user.isMembershipActive()
            },
            currentPage: 'dashboard'
        };
        
        // Additional data for platinum members
        if (membershipCode === 'p') {
            const platinumData = {
                ...commonData,
                nutritionChartData: nutritionChartData,
                recentFoods: recentFoods,
                todaysConsumedFoods: todaysConsumedFoods,
                nutritionStats: {
                    calorieAvg: Math.round(calorieAvg),
                    proteinAvg: Math.round(proteinAvg),
                    macros: macrosData
                },
                upcomingClass: upcomingClass
            };
            
            res.render(dashboardTemplate, platinumData);
        } else {
            res.render(dashboardTemplate, commonData);
        }
        
    } catch (error) {
        console.error('Error fetching dashboard:', error);
        res.status(500).send(`
            <html>
                <body>
                    <h1>Error Loading Dashboard</h1>
                    <p>There was an error loading your dashboard. Please try again.</p>
                    <p>Error: ${error.message}</p>
                    <a href="/userdashboard_${membershipCode}">Try Again</a>
                </body>
            </html>
        `);
    }
};


const completeWorkout = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            console.log('No user session found');
            return res.status(401).json({ error: 'Please log in to complete the workout' });
        }

        const userId = req.session.user.id;
        const { workoutPlanId } = req.body; // This is WorkoutHistory _id

        if (!workoutPlanId) {
            console.log('Missing workoutPlanId');
            return res.status(400).json({ error: 'Workout ID is required' });
        }

        console.log('Completing workout for user:', userId, 'Workout ID:', workoutPlanId);

        const workout = await WorkoutHistory.findOne({ _id: workoutPlanId, userId });
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

const markWorkoutCompleted = async (req, res) => {
    try {
        const { workoutId } = req.body;
        
        if (!req.session || !req.session.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const userId = req.session.user.id;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Check if workout history exists for today
        let workoutEntry = await WorkoutHistory.findOne({
            userId,
            workoutPlanId: workoutId,
            date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
        });
        
        if (workoutEntry) {
            // Update existing entry
            workoutEntry.completed = true;
            workoutEntry.progress = 100;
            if (workoutEntry.exercises) {
                workoutEntry.exercises.forEach(exercise => {
                    exercise.completed = true;
                });
            }
            await workoutEntry.save();
        } else {
            // Fetch workout plan
            const workoutPlan = await WorkoutPlan.findById(workoutId);
            if (!workoutPlan) {
                return res.status(404).json({ error: 'Workout plan not found' });
            }
            
            // Create new workout history entry
            const newWorkoutEntry = new WorkoutHistory({
                userId,
                workoutPlanId: workoutId,
                date: today,
                completed: true,
                progress: 100,
                exercises: workoutPlan.exercises.map(exercise => ({
                    day: new Date().toLocaleString('en-US', { weekday: 'long' }),
                    name: exercise.name,
                    sets: exercise.sets || 3,
                    reps: exercise.reps || 10,
                    duration: exercise.duration,
                    weight: exercise.weight,
                    completed: true
                }))
            });
            
            await newWorkoutEntry.save();
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking workout as completed:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Add this function to userController.js
// Replace the getTodaysFoods function in userController.js with this corrected version:
const getTodaysFoods = async (userId) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        console.log('=== GET TODAYS FOODS DEBUG ===');
        console.log('📅 Local Today:', today.toString());
        console.log('📅 Today day index:', today.getDay());
        console.log('📅 Today day name:', ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()]);

        // Use Sunday as week start (local time)
        const weekStart = new Date(today);
        const dayOfWeek = today.getDay();
        weekStart.setDate(today.getDate() - dayOfWeek);
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        
        console.log('📊 Local Week range:', weekStart.toString(), 'to', weekEnd.toString());

        // Get weekly nutrition data
        const weeklyNutrition = await NutritionHistory.findOne({
            userId: userId,
            date: { $gte: weekStart, $lt: weekEnd }
        });

        if (weeklyNutrition) {
            console.log('✅ Found weekly nutrition plan');
            console.log('📋 Plan date:', weeklyNutrition.date);
            
            const todayDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()];
            const todayData = weeklyNutrition.daily_nutrition[todayDayName];
            
            console.log('🍽️', todayDayName, 'foods:', todayData ? todayData.foods.length : 'no data');
            
            if (todayData && todayData.foods) {
                console.log('🎯 Foods found:');
                todayData.foods.forEach((food, index) => {
                    console.log(`${index + 1}. ${food.name} - ${food.calories} kcal - consumed: ${food.consumed}`);
                });
                
                // Return foods with proper consumed status
                return todayData.foods.map(food => ({
                    name: food.name,
                    calories: food.calories,
                    protein: food.protein,
                    carbs: food.carbs || 0,
                    fats: food.fats || 0,
                    consumed: food.consumed || false,
                    consumedAt: food.consumedAt
                }));
            } else {
                console.log('❌ No data found for today:', todayDayName);
                console.log('Available days:', Object.keys(weeklyNutrition.daily_nutrition || {}));
            }
        } else {
            console.log('❌ No weekly nutrition plan found for this week');
        }
        
        return [];
        
    } catch (error) {
        console.error('Error in getTodaysFoods:', error);
        return [];
    }
};

module.exports = {
    loginUser,
    signupUser,
    getUserDashboard,
    completeWorkout,
    getUserProfile,
    markWorkoutCompleted,
    checkMembershipActive,
    checkTrainerSubscription,
    updateUserProfile,
    changeMembership,
    getTodaysFoods,
    markExerciseCompleted // Add this line
};