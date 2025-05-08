const bcrypt = require('bcryptjs');
const User = require('../model/User');
const WorkoutPlan = require('../model/WorkoutPlan');

const getUserProfile = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            console.log('No user session found');
            return res.redirect('/login_signup?form=login');
        }
        
        const userId = req.session.user.id;
        console.log('Fetching user profile data for:', userId);
        
        // Fetch complete user data including workout history and populate references
        const user = await User.findById(userId)
            .populate('workout_history.workoutPlanId')
            .populate('trainer');
            
        if (!user) {
            console.log('User not found:', userId);
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Format workout history for display if it exists
        const workoutHistory = user.workout_history ? user.workout_history.map(workout => {
            return {
                id: workout._id,
                name: workout.workoutPlanId?.name || 'Unnamed Workout',
                date: workout.date,
                exercises: workout.exercises || [],
                progress: workout.progress || 0,
                completed: workout.completed || false
            };
        }) : [];
        
        // Sort workout history by date (most recent first) if there are entries
        if (workoutHistory.length > 0) {
            workoutHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
        }
        
        // Calculate fitness statistics
        const today = new Date();
        
        // Default to last month for statistics
        const oneMonthAgo = new Date(today);
        oneMonthAgo.setMonth(today.getMonth() - 1);
        
        // Initialize statistics variables
        let workoutsCompleted = 0;
        let caloriesBurned = 0;
        let hoursActive = 0;
        let goalsAchieved = 0;
        
        // Calculate statistics only if workout_history exists
        if (user.workout_history && user.workout_history.length > 0) {
            // Total workouts completed in the selected time period
            workoutsCompleted = user.workout_history.filter(w => 
                new Date(w.date) >= oneMonthAgo && 
                new Date(w.date) <= today &&
                w.completed
            ).length;
            
            // Calculate calories burned from workout history
            user.workout_history.forEach(workout => {
                if (new Date(workout.date) >= oneMonthAgo && 
                    new Date(workout.date) <= today &&
                    workout.completed) {
                    // Calculate calories based on workout exercises if they exist
                    if (workout.exercises && workout.exercises.length > 0) {
                        workout.exercises.forEach(exercise => {
                            // Estimate calories: ~5 calories per rep at average weight
                            const reps = exercise.reps || 0;
                            const sets = exercise.sets || 0;
                            // Basic estimation formula
                            caloriesBurned += (reps * sets * 5);
                        });
                    }
                }
            });
            
            // Calculate total active time in hours
            hoursActive = user.workout_history.reduce((total, workout) => {
                if (new Date(workout.date) >= oneMonthAgo && 
                    new Date(workout.date) <= today &&
                    workout.completed) {
                    // Estimate workout duration: ~1 hour per workout on average if not specified
                    return total + 1;
                }
                return total;
            }, 0);
            
            // Count achieved goals based on available data
            // Check workout completion rate as a goal
            const totalWorkoutsInPeriod = user.workout_history.filter(w => 
                new Date(w.date) >= oneMonthAgo && 
                new Date(w.date) <= today
            ).length;
            
            // If completed more than 80% of scheduled workouts, count as goal achieved
            if (totalWorkoutsInPeriod > 0 && (workoutsCompleted / totalWorkoutsInPeriod) >= 0.8) {
                goalsAchieved++;
            }
        }
        
        // Add nutrition-based calories if nutrition_history exists
        if (user.nutrition_history && user.nutrition_history.length > 0) {
            user.nutrition_history.forEach(entry => {
                if (new Date(entry.date) >= oneMonthAgo && 
                    new Date(entry.date) <= today) {
                    // Add recorded calories if available
                    if (entry.calories_consumed) {
                        // Assume a percentage of calories consumed were burned through activities
                        caloriesBurned += Math.round(entry.calories_consumed * 0.3);
                    }
                }
            });
            
            // Check if protein goals were met (if nutrition data available)
            const nutritionEntries = user.nutrition_history.filter(entry => 
                new Date(entry.date) >= oneMonthAgo && 
                new Date(entry.date) <= today
            );
            
            if (nutritionEntries.length > 0 && user.fitness_goals) {
                // Check protein goal achievement
                const avgProtein = nutritionEntries.reduce((sum, entry) => 
                    sum + (entry.protein_consumed || 0), 0) / nutritionEntries.length;
                    
                if (avgProtein >= (user.fitness_goals.protein_goal || 0)) {
                    goalsAchieved++;
                }
                
                // Check calorie goal
                const avgCalories = nutritionEntries.reduce((sum, entry) => 
                    sum + (entry.calories_consumed || 0), 0) / nutritionEntries.length;
                    
                if (user.fitness_goals.calorie_goal && avgCalories <= user.fitness_goals.calorie_goal) {
                    goalsAchieved++;
                }
            }
        }
        
        // Generate weekly workout data for the chart (last 4 weeks)
        const weeklyWorkoutData = [];
        const weekLabels = [];
        
        for (let i = 0; i < 4; i++) {
            const weekEnd = new Date(today);
            weekEnd.setDate(today.getDate() - (i * 7));
            
            const weekStart = new Date(weekEnd);
            weekStart.setDate(weekEnd.getDate() - 7);
            
            const weeklyCount = user.workout_history ? user.workout_history.filter(w => 
                new Date(w.date) >= weekStart && 
                new Date(w.date) < weekEnd &&
                w.completed
            ).length : 0;
            
            // Format week label (e.g., "Jun 1-7")
            const startMonth = weekStart.toLocaleString('default', { month: 'short' });
            const endMonth = weekEnd.toLocaleString('default', { month: 'short' });
            const weekLabel = startMonth === endMonth ? 
                `${startMonth} ${weekStart.getDate()}-${weekEnd.getDate()}` :
                `${startMonth} ${weekStart.getDate()}-${endMonth} ${weekEnd.getDate()}`;
            
            weeklyWorkoutData.unshift(weeklyCount); // Add to front of array
            weekLabels.unshift(weekLabel);
        }
        
        // Generate weight progress data from actual user history if available
        const weightProgress = [];
        
        // Try to get real weight data from workout history
        if (user.workout_history && user.workout_history.length > 0) {
            // Sort workout history by date (oldest first)
            const sortedWorkouts = [...user.workout_history].sort((a, b) => 
                new Date(a.date) - new Date(b.date)
            );
            
            // Get 4 recent data points for weight if available
            // First check if exercises have weight data
            const exercisesWithWeight = sortedWorkouts
                .filter(workout => workout.exercises && workout.exercises.some(e => e.weight))
                .map(workout => {
                    // Find the maximum weight used in this workout
                    const maxWeight = workout.exercises.reduce((max, exercise) => 
                        exercise.weight > max ? exercise.weight : max, 0);
                    return {
                        date: workout.date,
                        weight: maxWeight
                    };
                })
                .filter(item => item.weight > 0);
            
            if (exercisesWithWeight.length >= 4) {
                // Use actual workout weight data
                for (let i = 0; i < 4; i++) {
                    const index = Math.floor((exercisesWithWeight.length - 4 + i) * (exercisesWithWeight.length / 4));
                    const entry = exercisesWithWeight[Math.min(index, exercisesWithWeight.length - 1)];
                    
                    const date = new Date(entry.date);
                    const weekLabel = `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}`;
                    
                    weightProgress.push({
                        week: weekLabel,
                        weight: entry.weight
                    });
                }
            } else {
                // Fallback to user's current weight with timestamps from workout history
                const distinctWeeks = [];
                let currentWeek = null;
                
                for (const workout of sortedWorkouts) {
                    const workoutDate = new Date(workout.date);
                    const weekStart = new Date(workoutDate);
                    weekStart.setDate(workoutDate.getDate() - workoutDate.getDay());
                    
                    const weekKey = weekStart.toISOString().substring(0, 10);
                    if (!distinctWeeks.includes(weekKey)) {
                        distinctWeeks.push(weekKey);
                        
                        if (distinctWeeks.length > 4) {
                            distinctWeeks.shift(); // Keep only the 4 most recent weeks
                        }
                        
                        if (distinctWeeks.length <= 4) {
                            const weekLabel = `${weekStart.toLocaleString('default', { month: 'short' })} ${weekStart.getDate()}`;
                            weightProgress.push({
                                week: weekLabel,
                                weight: user.weight || 70 // Default to 70 if no weight data
                            });
                        }
                    }
                }
            }
        }
        
        // If we still don't have weight data, use basic fallback
        if (weightProgress.length === 0 && user.weight) {
            for (let i = 0; i < 4; i++) {
                const weekNumber = i + 1;
                weightProgress.push({
                    week: `Week ${weekNumber}`,
                    weight: user.weight
                });
            }
        } else if (weightProgress.length === 0) {
            // Last resort fallback
            for (let i = 0; i < 4; i++) {
                const weekNumber = i + 1;
                weightProgress.push({
                    week: `Week ${weekNumber}`,
                    weight: 70 // Default baseline weight
                });
            }
        }
        
        // Create fitnessStats object
        const fitnessStats = {
            workoutsCompleted: workoutsCompleted,
            caloriesBurned: caloriesBurned,
            hoursActive: hoursActive,
            goalsAchieved: goalsAchieved
        };
        
        // Create chartData object
        const chartData = {
            weeklyWorkouts: weeklyWorkoutData,
            weekLabels: weekLabels,
            weightProgress: weightProgress
        };
        
        // Pass all the data to the template
        res.render('userprofile', { 
            user: user, // Pass complete user object from database instead of session
            workoutHistory: workoutHistory,
            fitnessStats: fitnessStats,
            chartData: chartData,
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
        // Change in loginUser function (around line 35-40)
        // Update the user session data in loginUser function
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
                name: newUser.full_name, // Add name property for template compatibility
                membershipType: newUser.membershipType,
                membership: newUser.membershipType.toLowerCase() // Add lowercase membership for template compatibility
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

const getUserDashboard = async (req, res, dashboardType) => {
    try {
        if (!req.session || !req.session.user) {
            console.log('No user session found');
            return res.redirect('/login_signup?form=login');
        }
        const userId = req.session.user.id;
        console.log('Fetching dashboard data for user:', userId);
        const user = await User.findById(userId)
            .populate('trainer')
            .populate('workout_history.workoutPlanId')
            .select('full_name weight fitness_goals workout_history nutrition_history class_schedules');
        
        if (!user) {
            console.log('User not found:', userId);
            return res.status(404).json({ error: 'User not found' });
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const todayWorkout = user.workout_history.find(w => {
            const workoutDate = new Date(w.date);
            return workoutDate >= today && workoutDate < tomorrow;
        }) || {};
        const workoutData = {
            name: todayWorkout.workoutPlanId?.name || 'No Workout Scheduled',
            duration: todayWorkout.workoutPlanId?.duration || 60,
            exercises: todayWorkout.exercises || [],
            progress: todayWorkout.progress || 0,
            completed: todayWorkout.completed || false,
            workoutPlanId: todayWorkout.workoutPlanId?._id || null,
            completedExercises: todayWorkout.exercises?.filter(e => e.completed).length || 0,
            totalExercises: todayWorkout.exercises?.length || 0
        };
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        const weeklyWorkouts = {
            completed: user.workout_history.filter(w => {
                const workoutDate = new Date(w.date);
                return workoutDate >= weekStart && workoutDate < weekEnd && w.completed;
            }).length,
            total: user.workout_history.filter(w => {
                const workoutDate = new Date(w.date);
                return workoutDate >= weekStart && workoutDate < weekEnd;
            }).length
        };
        const todayNutrition = user.nutrition_history.find(n => {
            const nutritionDate = new Date(n.date);
            return nutritionDate >= today && nutritionDate < tomorrow;
        }) || {};
        const upcomingClass = user.class_schedules.find(c => {
            const classDate = new Date(c.date);
            return classDate >= today;
        }) || null;
        if (upcomingClass) {
            upcomingClass.trainerName = user.trainer?.full_name || 'Coach';
        }
        

        const exerciseProgress = [
            {
                name: 'Bicep Curls',
                currentWeight: 10,
                goalWeight: 12,
                progress: Math.round((10 / 12) * 100),
                history: [
                    { week: 'Week 1', weight: 5, date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000) },
                    { week: 'Week 2', weight: 6, date: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000) },
                    { week: 'Week 3', weight: 7, date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000) },
                    { week: 'Week 4', weight: 8, date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000) },
                    { week: 'Week 5', weight: 9, date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000) },
                    { week: 'Week 6', weight: 10, date: new Date(today.getTime()) }
                ],
                color: '#8A2BE2'
            },
            {
                name: 'Deadlift',
                currentWeight: 100,
                goalWeight: 140,
                progress: Math.round((100 / 140) * 100),
                history: [
                    { week: 'Week 1', weight: 60, date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000) },
                    { week: 'Week 2', weight: 70, date: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000) },
                    { week: 'Week 3', weight: 75, date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000) },
                    { week: 'Week 4', weight: 85, date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000) },
                    { week: 'Week 5', weight: 95, date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000) },
                    { week: 'Week 6', weight: 100, date: new Date(today.getTime()) }
                ],
                color: '#32CD32'
            },
            {
                name: 'Bench Press',
                currentWeight: 60,
                goalWeight: 100,
                progress: Math.round((60 / 100) * 100),
                history: [
                    { week: 'Week 1', weight: 40, date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000) },
                    { week: 'Week 2', weight: 45, date: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000) },
                    { week: 'Week 3', weight: 48, date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000) },
                    { week: 'Week 4', weight: 52, date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000) },
                    { week: 'Week 5', weight: 55, date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000) },
                    { week: 'Week 6', weight: 60, date: new Date(today.getTime()) }
                ],
                color: '#FF6347'
            }
        ];

        const recommendedFoods = [
            { name: 'Grilled Chicken Breast', protein: 31, perUnit: '100g', icon: 'fa-drumstick-bite' },
            { name: 'Whole Eggs', protein: 13, perUnit: '2 eggs', icon: 'fa-egg' },
            { name: 'Tofu (Firm)', protein: 20, perUnit: '100g', icon: 'fa-seedling' },
            { name: 'Salmon', protein: 25, perUnit: '100g', icon: 'fa-fish' }
        ];

        const template = `userdashboard_${dashboardType}`;
        
        console.log(`Rendering template: ${template}`);

        res.render(template, { 
            user: req.session.user,
            todayWorkout: workoutData,
            weeklyWorkouts,
            todayNutrition,
            upcomingClass,
            exerciseProgress,
            recommendedFoods,
            currentPage: 'dashboard'
        });
    } catch (error) {
        console.error('Error getting user dashboard:', error);
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
        const { workoutPlanId } = req.body;

        if (!workoutPlanId) {
            console.log('Missing workoutPlanId');
            return res.status(400).json({ error: 'Workout ID is required' });
        }

        console.log('Completing workout for user:', userId, 'Workout ID:', workoutPlanId);

        const user = await User.findById(userId);
        if (!user) {
            console.log('User not found:', userId);
            return res.status(404).json({ error: 'User not found' });
        }

        const workout = user.workout_history.find(w => w.workoutPlanId && w.workoutPlanId.toString() === workoutPlanId);
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

        await user.save();
        console.log('Workout completed successfully:', workoutPlanId);

        res.status(200).json({ message: 'Workout completed successfully' });
    } catch (error) {
        console.error('Error completing workout:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getUserDashboard = async (req, res, membershipType) => {
    try {
        if (!req.session || !req.session.user) {
            return res.redirect('/login_signup?form=login');
        }
        
        const userId = req.session.user.id;
        console.log(`Fetching dashboard data for user: ${userId}, membership: ${membershipType}`);
        
        // Fetch complete user data with populated workout history
        const user = await User.findById(userId)
            .populate('workout_history.workoutPlanId')
            .exec();
            
        if (!user) {
            console.log('User not found:', userId);
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Default today's nutrition and weekly workouts data
        const todayNutrition = { 
            calories_consumed: 0, 
            protein_consumed: 0 
        };
        
        const weeklyWorkouts = { 
            completed: 0, 
            total: 5 
        };
        
        // Get today's date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Initialize today's workout with default values
        let todayWorkout = {
            name: 'Rest Day',
            duration: 0,
            exercises: [],
            progress: 0,
            completedExercises: 0,
            totalExercises: 0,
            completed: false,
            workoutPlanId: null
        };
        
        // Find today's workout in user's workout history
        let todayWorkoutHistory = null;
        
        if (user.workout_history && user.workout_history.length > 0) {
            todayWorkoutHistory = user.workout_history.find(entry => {
                const entryDate = new Date(entry.date);
                entryDate.setHours(0, 0, 0, 0);
                return entryDate.getTime() === today.getTime();
            });
        }
        
        // If no workout for today in history, try to find the latest workout from WorkoutHistory model
        if (!todayWorkoutHistory) {
            console.log("No workout for today in user history, checking WorkoutHistory collection");
            
            const WorkoutHistory = require('../model/WorkoutHistory');
            const latestWorkout = await WorkoutHistory.findOne({ 
                userId: userId 
            })
            .sort({ date: -1 })
            .populate('workoutPlanId')
            .exec();
            
            if (latestWorkout) {
                console.log(`Found latest workout history for user: ${latestWorkout._id}`);
                
                // Get the day of week for today
                const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const todayDay = daysOfWeek[today.getDay()];
                
                // Filter exercises for today's day
                const todayExercises = latestWorkout.exercises.filter(ex => ex.day === todayDay);
                
                if (todayExercises.length > 0) {
                    // Create a workout object from the filtered exercises
                    todayWorkout = {
                        name: latestWorkout.workoutPlanId ? latestWorkout.workoutPlanId.type : `${todayDay}'s Workout`,
                        duration: "45 min", // Default duration
                        workoutPlanId: latestWorkout.workoutPlanId ? latestWorkout.workoutPlanId._id : latestWorkout._id,
                        exercises: todayExercises.map(exercise => ({
                            name: exercise.name,
                            sets: exercise.sets,
                            reps: exercise.reps,
                            duration: exercise.duration,
                            weight: exercise.weight,
                            completed: exercise.completed
                        })),
                        totalExercises: todayExercises.length,
                        completedExercises: todayExercises.filter(ex => ex.completed).length,
                        progress: 0,
                        completed: latestWorkout.completed
                    };
                    
                    // Calculate progress
                    if (todayWorkout.totalExercises > 0) {
                        todayWorkout.progress = Math.round((todayWorkout.completedExercises / todayWorkout.totalExercises) * 100);
                    }
                    
                    console.log(`Today's workout has ${todayWorkout.exercises.length} exercises, ${todayWorkout.completedExercises} completed`);
                }
            } else {
                console.log("No workout history found, checking WorkoutPlan collection");
                
                // If no workout history, try to find a workout plan
                // Fetch a workout plan appropriate for the membership type
                let difficultyLevel = "Beginner";
                
                if (membershipType === 'p') {
                    difficultyLevel = "Advanced";
                } else if (membershipType === 'g') {
                    difficultyLevel = "Intermediate";
                }
                
                const WorkoutPlan = require('../model/WorkoutPlan');
                const workoutPlan = await WorkoutPlan.findOne({ 
                    difficulty: difficultyLevel 
                }).exec();
                
                if (workoutPlan) {
                    console.log(`Found workout plan: ${workoutPlan.name} (${workoutPlan.type})`);
                    
                    // Get the day of week for today
                    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const todayDay = daysOfWeek[today.getDay()];
                    
                    // If the workout plan has exercises for today
                    if (workoutPlan.exercises && workoutPlan.exercises.length > 0) {
                        // Filter for today's exercises if day field exists, otherwise use all
                        const relevantExercises = workoutPlan.exercises.filter(ex => 
                            !ex.day || ex.day === todayDay
                        );
                        
                        if (relevantExercises.length > 0) {
                            todayWorkout = {
                                name: workoutPlan.type || `${todayDay}'s Training`,
                                duration: workoutPlan.duration || "45 min",
                                workoutPlanId: workoutPlan._id,
                                exercises: relevantExercises.map(exercise => ({
                                    name: exercise.name,
                                    sets: exercise.sets,
                                    reps: exercise.reps,
                                    duration: exercise.duration,
                                    weight: exercise.weight,
                                    completed: false
                                })),
                                totalExercises: relevantExercises.length,
                                completedExercises: 0,
                                progress: 0,
                                completed: false
                            };
                            
                            console.log(`Created new workout with ${todayWorkout.exercises.length} exercises`);
                        }
                    }
                }
            }
        } else {
            // We found today's workout in user history
            console.log(`Found today's workout in user history: ${todayWorkoutHistory._id}`);
            
            const planName = todayWorkoutHistory.workoutPlanId ? 
                (todayWorkoutHistory.workoutPlanId.type || todayWorkoutHistory.workoutPlanId.name) : 
                "Today's Workout";
                
            todayWorkout = {
                name: planName,
                duration: todayWorkoutHistory.workoutPlanId ? todayWorkoutHistory.workoutPlanId.duration : "45 min",
                workoutPlanId: todayWorkoutHistory.workoutPlanId ? todayWorkoutHistory.workoutPlanId._id : null,
                exercises: todayWorkoutHistory.exercises.map(exercise => ({
                    name: exercise.name,
                    sets: exercise.sets,
                    reps: exercise.reps,
                    duration: exercise.duration,
                    weight: exercise.weight,
                    completed: exercise.completed
                })),
                totalExercises: todayWorkoutHistory.exercises.length,
                completedExercises: todayWorkoutHistory.exercises.filter(ex => ex.completed).length,
                progress: todayWorkoutHistory.progress || 0,
                completed: todayWorkoutHistory.completed
            };
            
            // Calculate progress if not already set
            if (todayWorkout.progress === 0 && todayWorkout.totalExercises > 0) {
                todayWorkout.progress = Math.round((todayWorkout.completedExercises / todayWorkout.totalExercises) * 100);
            }
        }
        
        // Calculate weekly workouts stats
        if (user.workout_history && user.workout_history.length > 0) {
            // Get start of current week (Sunday)
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            
            // Count completed workouts this week
            weeklyWorkouts.completed = user.workout_history.filter(workout => {
                const workoutDate = new Date(workout.date);
                return workoutDate >= startOfWeek && 
                       workoutDate <= today && 
                       workout.completed;
            }).length;
        }
        
        // Get today's nutrition if available
        if (user.nutrition_history && user.nutrition_history.length > 0) {
            const todayNutritionEntry = user.nutrition_history.find(entry => {
                const entryDate = new Date(entry.date);
                entryDate.setHours(0, 0, 0, 0);
                return entryDate.getTime() === today.getTime();
            });
            
            if (todayNutritionEntry) {
                todayNutrition.calories_consumed = todayNutritionEntry.calories_consumed || 0;
                todayNutrition.protein_consumed = todayNutritionEntry.protein_consumed || 0;
            }
        }
        
        // Set up empty exercise progress for now
        const exerciseProgress = [];
        
        // Check for upcoming class
        let upcomingClass = null;
        
        if (user.class_schedules && user.class_schedules.length > 0) {
            // Sort classes by date
            const sortedClasses = [...user.class_schedules].sort((a, b) => 
                new Date(a.date) - new Date(b.date)
            );
            
            // Find the next upcoming class
            upcomingClass = sortedClasses.find(cls => new Date(cls.date) >= today);
            
            if (upcomingClass) {
                console.log(`Found upcoming class: ${upcomingClass.name} on ${upcomingClass.date}`);
            }
        }
        
        // Log what we're rendering
        console.log("Rendering dashboard with workout:", {
            name: todayWorkout.name,
            exercises: todayWorkout.totalExercises,
            completed: todayWorkout.completedExercises
        });
        
        // Render the dashboard
        res.render(`userdashboard_${membershipType}`, {
            user: user,
            todayWorkout: todayWorkout,
            weeklyWorkouts: weeklyWorkouts,
            todayNutrition: todayNutrition,
            exerciseProgress: exerciseProgress,
            upcomingClass: upcomingClass,
            currentPage: 'dashboard'
        });
        
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).render('error', { 
            message: 'Error loading dashboard',
            error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
        });
    }
};

exports.markWorkoutCompleted = async (req, res) => {
    try {
        const { workoutId } = req.body;
        
        if (!req.session || !req.session.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const userId = req.session.user.id;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Get today's date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Check if workout is already logged for today
        let workoutEntry = null;
        
        if (user.workout_history) {
            workoutEntry = user.workout_history.find(entry => {
                const entryDate = new Date(entry.date);
                entryDate.setHours(0, 0, 0, 0);
                
                return entryDate.getTime() === today.getTime() && 
                       entry.workoutPlanId && 
                       entry.workoutPlanId.toString() === workoutId;
            });
        }
        
        if (workoutEntry) {
            // Update existing entry
            workoutEntry.completed = true;
            
            // Mark all exercises as completed
            if (workoutEntry.exercises) {
                workoutEntry.exercises.forEach(exercise => {
                    exercise.completed = true;
                });
            }
        } else {
            // Fetch workout plan
            const workoutPlan = await WorkoutPlan.findById(workoutId);
            
            if (!workoutPlan) {
                return res.status(404).json({ error: 'Workout plan not found' });
            }
            
            // Create new workout history entry
            const newWorkoutEntry = {
                date: today,
                workoutPlanId: workoutId,
                completed: true,
                exercises: workoutPlan.exercises.map(exercise => ({
                    name: exercise.name,
                    sets: exercise.sets || 3,
                    reps: exercise.reps || 10,
                    duration: exercise.duration,
                    weight: exercise.weight,
                    completed: true
                }))
            };
            
            // Add to workout history
            if (!user.workout_history) {
                user.workout_history = [];
            }
            
            user.workout_history.push(newWorkoutEntry);
        }
        
        // Save updated user data
        await user.save();
        
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
    getUserProfile
};