const bcrypt = require('bcryptjs');
const User = require('../model/User');
const WorkoutPlan = require('../model/WorkoutPlan');
const WorkoutHistory = require('../model/WorkoutHistory');
const NutritionHistory = require('../model/NutritionHistory');

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
            BMI: calculatedBMI
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

// Update the getUserDashboard function in userController.js to fetch nutrition data:

// Get user dashboard based on membership type
const getUserDashboard = async (req, res, membershipCode) => {
    try {
        if (!req.session || !req.session.user) {
            return res.redirect('/login_signup?form=login');
        }
        
        const userId = req.session.user.id;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).render('error', { message: 'User not found' });
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
            
        // Get nutrition data
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Get today's nutrition data
        const todayNutrition = await NutritionHistory.findOne({
            userId: userId,
            date: { $gte: today, $lt: tomorrow }
        }) || { calories_consumed: 0, protein_consumed: 0 };
        
        // Get last 7 days nutrition data for weekly stats
        const weekStartDate = new Date();
        weekStartDate.setDate(weekStartDate.getDate() - 7);
        weekStartDate.setHours(0, 0, 0, 0);
        
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
        
        // Create array of last 7 dates
        const dateLabels = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
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
        
        // Most recent foods for food log (platinum feature only)
        const recentFoods = weeklyNutrition.reduce((foods, entry) => {
            if (entry.foods && entry.foods.length > 0) {
                return [...foods, ...entry.foods.map(food => ({
                    ...food.toObject(),
                    date: entry.date
                }))];
            }
            return foods;
        }, [])
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);
        
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
            // Use average from weekly data if today's not available
            const macrosEntries = weeklyNutrition.filter(entry => entry.macros);
            if (macrosEntries.length > 0) {
                macrosData = {
                    protein: macrosEntries.reduce((sum, entry) => sum + (entry.macros.protein || 0), 0) / macrosEntries.length,
                    carbs: macrosEntries.reduce((sum, entry) => sum + (entry.macros.carbs || 0), 0) / macrosEntries.length,
                    fats: macrosEntries.reduce((sum, entry) => sum + (entry.macros.fats || 0), 0) / macrosEntries.length
                };
            }
        }
        
        // Common data for all membership types
        const commonData = {
            user: user,
            recentWorkouts: recentWorkouts,
            todayNutrition: todayNutrition,
            weeklyWorkouts: {
                completed: recentWorkouts.filter(w => w.completed).length,
                total: recentWorkouts.length
            },
            todayWorkout: recentWorkouts.length > 0 
                ? {
                    exercises: recentWorkouts[0].exercises || [],
                    progress: recentWorkouts[0].progress || 0,
                    completed: recentWorkouts[0].completed || false,
                    completedExercises: recentWorkouts[0].exercises ? recentWorkouts[0].exercises.filter(e => e.completed).length : 0,
                    totalExercises: recentWorkouts[0].exercises ? recentWorkouts[0].exercises.length : 0,
                    duration: recentWorkouts[0].exercises ? recentWorkouts[0].exercises.reduce((total, ex) => total + (ex.duration || 0), 45) : 45,
                    workoutPlanId: recentWorkouts[0]._id
                } 
                : { exercises: [], progress: 0, completedExercises: 0, totalExercises: 0, duration: 0 },
            exerciseProgress: [
                { name: 'Bench Press', progress: 75, currentWeight: 80, goalWeight: 100 },
                { name: 'Squat', progress: 60, currentWeight: 90, goalWeight: 120 },
                { name: 'Deadlift', progress: 85, currentWeight: 110, goalWeight: 130 }
            ],
            currentPage: 'dashboard'
        };
        
        // Additional data for platinum members
        if (membershipCode === 'p') {
            // Add platinum-specific data
            const platinumData = {
                ...commonData,
                nutritionChartData: nutritionChartData,
                recentFoods: recentFoods,
                nutritionStats: {
                    calorieAvg: Math.round(calorieAvg),
                    proteinAvg: Math.round(proteinAvg),
                    macros: macrosData
                },
                upcomingClass: user.class_schedules && user.class_schedules.length > 0 
                    ? user.class_schedules[0] 
                    : null
            };
            
            // Render platinum dashboard with all features
            res.render(dashboardTemplate, platinumData);
        } else {
            // Render gold/basic dashboard with limited features
            res.render(dashboardTemplate, commonData);
        }
        
    } catch (error) {
        console.error('Error fetching dashboard:', error);
        res.status(500).render('error', { 
            message: 'Error loading dashboard',
            error: error
        });
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

module.exports = {
    loginUser,
    signupUser,
    getUserDashboard,
    completeWorkout,
    getUserProfile,
    markWorkoutCompleted
};