const bcrypt = require('bcryptjs');
const TrainerApplication = require('../model/TrainerApplication');
const Trainer = require('../model/Trainer');
const User = require('../model/User');
const WorkoutHistory = require('../model/WorkoutHistory');
const NutritionHistory = require('../model/NutritionHistory');

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

        if (password !== confirmPassword) {
            console.log('Validation failed: Passwords do not match');
            return res.status(400).json({ error: 'Passwords do not match' });
        }

        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(email)) {
            console.log('Validation failed: Invalid email:', email);
            return res.status(400).json({ error: 'Invalid email address' });
        }

        const phoneRegex = /^\+?[\d\s-]{10,}$/;
        if (!phoneRegex.test(phone)) {
            console.log('Validation failed: Invalid phone number:', phone);
            return res.status(400).json({ error: 'Invalid phone number' });
        }

        const validExperience = ['1-2', '3-5', '5-10', '10+'];
        if (!validExperience.includes(experience)) {
            console.log('Validation failed: Invalid experience:', experience);
            return res.status(400).json({ error: 'Invalid experience selection' });
        }

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

        const existingApplication = await TrainerApplication.findOne({ email });
        if (existingApplication) {
            console.log('Validation failed: Email already registered:', email);
            return res.status(400).json({ error: 'Email already registered' });
        }

        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);
        console.log('Password hashed for:', email);

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

        await newApplication.save();
        console.log('Trainer application saved to MongoDB:', email);

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

        if (!email || !password) {
            console.log('Validation failed: Missing email or password');
            return res.status(400).render('trainer_login', {
                errorMessage: 'Email and password are required',
                email
            });
        }

        const trainer = await Trainer.findOne({ email });
        if (!trainer) {
            console.log('Trainer not found:', email);
            return res.status(401).render('trainer_login', {
                errorMessage: 'Invalid email or password',
                email
            });
        }

        if (trainer.status !== 'Active') {
            console.log('Trainer account not active:', email, trainer.status);
            return res.status(403).render('trainer_login', {
                errorMessage: `Your account is ${trainer.status.toLowerCase()}. Please contact support.`,
                email
            });
        }

        const isMatch = await bcrypt.compare(password, trainer.password_hash);
        if (!isMatch) {
            console.log('Invalid password for:', email);
            return res.status(401).render('trainer_login', {
                errorMessage: 'Invalid email or password',
                email
            });
        }

        req.session.trainer = {
            id: trainer._id,
            email: trainer.email,
            name: trainer.full_name || 'Trainer'
        };
        console.log('Session set for trainer:', email);

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

const renderTrainerDashboard = async (req, res) => {
    try {
        if (!req.session.trainer) {
            console.log('Unauthorized access to trainer dashboard');
            return res.redirect('/trainer_login');
        }

        const trainerId = req.session.trainer.id;
        console.log('Fetching Platinum users for trainer:', trainerId);

        // Fetch trainer details
        const trainer = await Trainer.findById(trainerId);
      
        // Fetch Platinum users assigned to this trainer
        const users = await User.find({ 
            trainer: trainerId, 
            status: 'Active',
            membershipType: 'Platinum'
        })
            .select('full_name dob weight height BMI fitness_goals class_schedules')
            .lean();

        console.log('Found Platinum users:', users.length);

        const clients = users.map(user => {
            const progress = 0; // We'll fetch this dynamically on client selection

            const nextSession = user.class_schedules && user.class_schedules.length > 0
                ? user.class_schedules.find(schedule => new Date(schedule.date) >= new Date())
                : null;
            const nextSessionDate = nextSession
                ? new Date(nextSession.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : 'None';

            const dob = new Date(user.dob);
            const today = new Date();
            let age = today.getFullYear() - dob.getFullYear();
            const monthDiff = today.getMonth() - dob.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
                age--;
            }

            const fitnessGoal = user.fitness_goals?.weight_goal
                ? `${user.fitness_goals.weight_goal} kg`
                : user.fitness_goals?.calorie_goal
                ? `${user.fitness_goals.calorie_goal} kcal`
                : 'Not set';

            return {
                id: user._id,
                name: user.full_name || 'Unknown',
                progress,
                nextSession: nextSessionDate,
                age: isNaN(age) ? 'N/A' : age,
                weight: user.weight ? `${user.weight} kg` : 'N/A',
                height: user.height ? `${user.height} cm` : 'N/A',
                bodyFat: user.BMI ? `${user.BMI.toFixed(1)} (BMI)` : 'N/A',
                goal: fitnessGoal
            };
        });

        // Fetch data for the first client (if available) - FIXED VERSION
        let selectedClient = clients.length > 0 ? clients[0] : null;
        let nutritionData = null;
        let workoutData = null;

        if (selectedClient) {
            try {
                // Get today's date for nutrition data
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);

                // Fetch nutrition data directly
                const latestNutrition = await NutritionHistory.findOne({
                    userId: selectedClient.id,
                    date: { $gte: today, $lt: tomorrow }
                }).lean();

                nutritionData = {
                    nutrition: {
                        protein_goal: users.find(u => u._id.toString() === selectedClient.id)?.fitness_goals?.protein_goal || 'N/A',
                        calorie_goal: users.find(u => u._id.toString() === selectedClient.id)?.fitness_goals?.calorie_goal || 'N/A',
                        foods: latestNutrition ? latestNutrition.foods : [],
                        macros: latestNutrition ? latestNutrition.macros : { protein: 0, carbs: 0, fats: 0 }
                    }
                };

                // Fetch workout data directly
                const todayWorkout = new Date();
                todayWorkout.setHours(0, 0, 0, 0);
                const weekStart = new Date(todayWorkout);
                weekStart.setDate(todayWorkout.getDate() - todayWorkout.getDay()); // Start of week (Sunday)
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 7);

                const currentWorkout = await WorkoutHistory.findOne({
                    userId: selectedClient.id,
                    date: { $gte: weekStart, $lt: weekEnd }
                }).lean();

                const weeklySchedule = {
                    Monday: [],
                    Tuesday: [],
                    Wednesday: [],
                    Thursday: [],
                    Friday: [],
                    Saturday: [],
                    Sunday: []
                };

                if (currentWorkout && currentWorkout.exercises) {
                    currentWorkout.exercises.forEach(exercise => {
                        if (weeklySchedule[exercise.day]) {
                            weeklySchedule[exercise.day].push({
                                name: exercise.name,
                                sets: exercise.sets,
                                reps: exercise.reps,
                                weight: exercise.weight,
                                duration: exercise.duration,
                                completed: exercise.completed
                            });
                        }
                    });
                }

                workoutData = { weeklySchedule };
            } catch (dataError) {
                console.error('Error fetching client data:', dataError);
                // Continue with null data rather than failing completely
            }
        }

        res.render('trainer', {
            trainer: req.session.trainer,
            clients,
            selectedClient,
            workoutData,
            nutritionData
        });
    } catch (error) {
        console.error('Error rendering trainer dashboard:', error);
        res.status(500).render('trainer_login', {
            errorMessage: 'Server error. Please try again later.',
            email: ''
        });
    }
};

const renderEditWorkoutPlan = async (req, res) => {
    try {
        if (!req.session.trainer) {
            console.log('Unauthorized access to edit workout plan');
            return res.redirect('/trainer_login');
        }

        const userId = req.params.userId;
        const trainerId = req.session.trainer.id;

        const user = await User.findOne({ 
            _id: userId, 
            trainer: trainerId,
            membershipType: 'Platinum'
        })
            .select('full_name fitness_goals')
            .lean();

        if (!user) {
            console.log('Platinum user not found or not assigned to trainer:', userId);
            return res.status(404).render('trainer', {
                errorMessage: 'Client not found, not a Platinum member, or not assigned to you'
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const currentWorkout = await WorkoutHistory.findOne({
            userId: userId,
            date: { $gte: today, $lt: tomorrow }
        }).lean() || null;

        const workoutPlan = currentWorkout ? {
            Monday: currentWorkout.exercises.filter(ex => ex.day === 'Monday'),
            Tuesday: currentWorkout.exercises.filter(ex => ex.day === 'Tuesday'),
            Wednesday: currentWorkout.exercises.filter(ex => ex.day === 'Wednesday'),
            Thursday: currentWorkout.exercises.filter(ex => ex.day === 'Thursday'),
            Friday: currentWorkout.exercises.filter(ex => ex.day === 'Friday'),
            Saturday: currentWorkout.exercises.filter(ex => ex.day === 'Saturday'),
            Sunday: currentWorkout.exercises.filter(ex => ex.day === 'Sunday')
        } : {};

        res.render('workoutplanedit', {
            trainer: req.session.trainer,
            id: user._id,
            name: user.full_name,
            goal: user.fitness_goals.weight_goal ? `${user.fitness_goals.weight_goal} kg` : user.fitness_goals.calorie_goal ? `${user.fitness_goals.calorie_goal} kcal` : 'Strength Training',
            workoutPlan,
            notes: currentWorkout ? currentWorkout.notes : ''
        });
    } catch (error) {
        console.error('Error rendering edit workout plan:', error);
        res.status(500).render('trainer', {
            errorMessage: 'Server error. Please try again later.'
        });
    }
};

const saveWorkoutPlan = async (req, res) => {
    try {
        if (!req.session.trainer) {
            console.log('Unauthorized access to save workout plan');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { clientId, notes, currentWeek, nextWeek } = req.body;
        const trainerId = req.session.trainer.id;

        console.log('Saving workout plan for Platinum user:', clientId);
        
        // ADD THESE DEBUG LOGS:
        console.log('=== DEBUG: Received currentWeek data ===');
        console.log(JSON.stringify(currentWeek, null, 2));
        console.log('=== DEBUG: Received nextWeek data ===');
        console.log(JSON.stringify(nextWeek, null, 2));

        if (!clientId || !currentWeek || !nextWeek) {
            console.log('Validation failed: Missing required fields');
            return res.status(400).json({ error: 'All fields are required' });
        }

        const user = await User.findOne({ 
            _id: clientId, 
            trainer: trainerId,
            membershipType: 'Platinum'
        });
        if (!user) {
            console.log('Platinum user not found or not assigned to trainer:', clientId);
            return res.status(404).json({ error: 'Client not found, not a Platinum member, or not assigned to you' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        const currentWeekExercises = [];
        for (const [day, exercises] of Object.entries(currentWeek)) {
            // ADD DEBUG LOGS FOR EACH EXERCISE:
            console.log(`=== DEBUG: Processing ${day} ===`);
            exercises.forEach(ex => {
                console.log('Exercise data:', ex);
                console.log('sets:', ex.sets, 'type:', typeof ex.sets);
                console.log('reps:', ex.reps, 'type:', typeof ex.reps);
                console.log('weight:', ex.weight, 'type:', typeof ex.weight);
                
                if (ex.name || !ex.name.trim()) {
                    const processedExercise = {
                        day,
                        name: ex.name,
                        sets: ex.sets ? parseInt(ex.sets) : null,
                        reps: ex.reps ? parseInt(ex.reps) : null,
                        weight: ex.weight ? parseFloat(ex.weight) : null,
                        duration: ex.duration ? parseInt(ex.duration) : null,
                        completed: false
                    };
                    console.log('Processed exercise:', processedExercise);
                    currentWeekExercises.push(processedExercise);
                }
            });
        }

        let currentWeekWorkout = await WorkoutHistory.findOne({
            userId: clientId,
            date: { $gte: weekStart, $lt: weekEnd }
        });

        if (currentWeekWorkout) {
            currentWeekWorkout.exercises = currentWeekExercises;
            currentWeekWorkout.progress = 0;
            currentWeekWorkout.completed = false;
            currentWeekWorkout.notes = notes;
            console.log('Updated existing workout history entry for current week:', clientId);
        } else {
            currentWeekWorkout = new WorkoutHistory({
                userId: clientId,
                date: weekStart,
                exercises: currentWeekExercises,
                progress: 0,
                completed: false,
                notes
            });
            console.log('Added new workout history entry for current week:', clientId);
        }
        await currentWeekWorkout.save();

        // Link workout to user if not already linked            REYNA
        if (!user.workout_history.some(id => id.equals(currentWeekWorkout._id))) {
            user.workout_history.push(currentWeekWorkout._id);
            await user.save(); 
        }


        const nextWeekStart = new Date(weekEnd);
        const nextWeekEnd = new Date(nextWeekStart);
        nextWeekEnd.setDate(nextWeekStart.getDate() + 7);

        const nextWeekExercises = [];
        for (const [day, exercises] of Object.entries(nextWeek)) {
            exercises.forEach(ex => {
                if (ex.name) {
                    nextWeekExercises.push({
                        day,
                        name: ex.name,
                        sets: ex.sets ? parseInt(ex.sets) : null,
                        reps: ex.reps ? parseInt(ex.reps) : null,
                        weight: ex.weight ? parseFloat(ex.weight) : null,
                        duration: ex.duration ? parseInt(ex.duration) : null,
                        completed: false
                    });
                }
            });
        }

        let nextWeekWorkout = await WorkoutHistory.findOne({
            userId: clientId,
            date: { $gte: nextWeekStart, $lt: nextWeekEnd }
        });

        if (nextWeekWorkout) {
            nextWeekWorkout.exercises = nextWeekExercises;
            nextWeekWorkout.progress = 0;
            nextWeekWorkout.completed = false;
            nextWeekWorkout.notes = notes;
            console.log('Updated existing workout history entry for next week:', clientId);
        } else {
            nextWeekWorkout = new WorkoutHistory({
                userId: clientId,
                date: nextWeekStart,
                exercises: nextWeekExercises,
                progress: 0,
                completed: false,
                notes
            });
            console.log('Added new workout history entry for next week:', clientId);
        }
        await nextWeekWorkout.save();

        // link nxt week workout to user if not already linked          REYNA
        if (!user.workout_history.some(id => id.equals(nextWeekWorkout._id))) {
            user.workout_history.push(nextWeekWorkout._id);
            await user.save();
        }


        res.json({ message: 'Workout plan saved successfully', redirect: '/trainer' });
    } catch (error) {
        console.error('Error saving workout plan:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

const renderEditNutritionPlan = async (req, res) => {
    try {
        if (!req.session.trainer) {
            console.log('Unauthorized access to edit nutrition plan');
            return res.redirect('/trainer_login');
        }

        const userId = req.params.userId;
        const trainerId = req.session.trainer.id;

        const user = await User.findOne({ 
            _id: userId, 
            trainer: trainerId,
            membershipType: 'Platinum'
        })
            .select('full_name fitness_goals')
            .lean();

        if (!user) {
            console.log('Platinum user not found or not assigned to trainer:', userId);
            return res.status(404).render('trainer', {
                errorMessage: 'Client not found, not a Platinum member, or not assigned to you'
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const latestNutrition = await NutritionHistory.findOne({
            userId: userId,
            date: { $gte: today, $lt: tomorrow }
        }).lean() || null;

        res.render('edit_nutritional_plan', {
            trainer: req.session.trainer,
            client: {
                id: user._id,
                name: user.full_name,
                proteinGoal: user.fitness_goals.protein_goal || 90,
                calorieGoal: user.fitness_goals.calorie_goal || 2000,
                foods: latestNutrition ? latestNutrition.foods : []
            }
        });
    } catch (error) {
        console.error('Error rendering edit nutrition plan:', error);
        res.status(500).render('trainer', {
            errorMessage: 'Server error. Please try again later.'
        });
    }
};

const editNutritionPlan = async (req, res) => {
    try {
        if (!req.session.trainer) {
            console.log('Unauthorized access to save nutrition plan');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { userId, proteinGoal, calorieGoal, foods } = req.body;
        const trainerId = req.session.trainer.id;

        console.log('Saving nutrition plan for Platinum user:', userId);

        if (!userId || !proteinGoal || !calorieGoal || !Array.isArray(foods)) {
            console.log('Validation failed: Missing required fields');
            return res.status(400).json({ error: 'All fields are required' });
        }

        const user = await User.findOne({ 
            _id: userId, 
            trainer: trainerId,
            membershipType: 'Platinum'
        });
        if (!user) {
            console.log('Platinum user not found or not assigned to trainer:', userId);
            return res.status(404).json({ error: 'Client not found, not a Platinum member, or not assigned to you' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        let nutritionEntry = await NutritionHistory.findOne({
            userId: userId,
            date: { $gte: today, $lt: tomorrow }
        });

        const nutritionData = {
            calories_consumed: foods.reduce((sum, food) => sum + (food.calories || 0), 0),
            protein_consumed: foods.reduce((sum, food) => sum + (food.protein || 0), 0),
            macros: {
                protein: foods.length > 0 ? (foods.reduce((sum, food) => sum + (food.protein || 0), 0) / foods.length) : 0,
                carbs: foods.length > 0 ? (foods.reduce((sum, food) => sum + (food.carbs || 0), 0) / foods.length) : 0,
                fats: foods.length > 0 ? (foods.reduce((sum, food) => sum + (food.fats || 0), 0) / foods.length) : 0
            },
            foods: foods.map(food => ({
                name: food.name,
                protein: food.protein || 0,
                calories: food.calories || 0
            }))
        };

        if (nutritionEntry) {
            nutritionEntry.calories_consumed = nutritionData.calories_consumed;
            nutritionEntry.protein_consumed = nutritionData.protein_consumed;
            nutritionEntry.macros = nutritionData.macros;
            nutritionEntry.foods = nutritionData.foods;
            console.log('Updated existing nutrition history entry for today:', userId);
        } else {
            nutritionEntry = new NutritionHistory({
                userId: userId,
                date: today,
                ...nutritionData
            });
            console.log('Added new nutrition history entry for today:', userId);
        }
        await nutritionEntry.save();

        // Link nutrition entry to user if not already linked              REYNA
        if (!user.nutrition_history) user.nutrition_history = [];

        const alreadyLinked = user.nutrition_history.some(id => id.equals(nutritionEntry._id));

        if (!alreadyLinked) {
            user.nutrition_history.push(nutritionEntry._id);
            await user.save();
        }



        user.fitness_goals.protein_goal = parseInt(proteinGoal);
        user.fitness_goals.calorie_goal = parseInt(calorieGoal);
        await user.save();
        console.log('Nutrition plan and goals saved for Platinum user:', userId);

        res.json({ message: 'Nutrition plan saved successfully', redirect: '/trainer' });
    } catch (error) {
        console.error('Error saving nutrition plan:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

const getClientData = async (req, res) => {
    try {
        const userId = req.params.id;
        const trainerId = req.session.trainer.id;
        const user = await User.findOne({ _id: userId, trainer: trainerId, membershipType: 'Platinum' })
            .select('full_name dob weight height BMI fitness_goals')
            .lean();
        if (!user) {
            return res.status(404).json({ error: 'Client not found' });
        }
        const dob = new Date(user.dob);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
            age--;
        }
        const fitnessGoal = user.fitness_goals.weight_goal
            ? `${user.fitness_goals.weight_goal} kg`
            : user.fitness_goals.calorie_goal
            ? `${user.fitness_goals.calorie_goal} kcal`
            : 'Not set';
        res.json({
            name: user.full_name,
            age: isNaN(age) ? 'N/A' : age,
            weight: user.weight ? `${user.weight} kg` : 'N/A',
            height: user.height ? `${user.height} cm` : 'N/A',
            bodyFat: user.BMI ? `${user.BMI.toFixed(1)} (BMI)` : 'N/A',
            goal: fitnessGoal
        });
    } catch (error) {
        console.error('Error fetching client data:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

const getWorkoutData = async (req, res) => {
    try {
        if (!req.session.trainer) {
            console.log('Unauthorized access to workout data');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userId = req.params.userId;
        const trainerId = req.session.trainer.id;

        const user = await User.findOne({ 
            _id: userId, 
            trainer: trainerId,
            membershipType: 'Platinum'
        }).lean();

        if (!user) {
            console.log('Platinum user not found or not assigned to trainer:', userId);
            return res.status(404).json({ error: 'Client not found, not a Platinum member, or not assigned to you' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // Start of the week (Sunday)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        // REYNA
        // This logic is incomplete for determining today's exercises
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayDayName = dayNames[today.getDay()];
        // END REYNA
        const currentWorkout = await WorkoutHistory.findOne({
            userId: userId,
            date: { $gte: weekStart, $lt: weekEnd }
        }).lean() || null;

        const weeklySchedule = {
            Monday: [],
            Tuesday: [],
            Wednesday: [],
            Thursday: [],
            Friday: [],
            Saturday: [],
            Sunday: []
        };

        if (currentWorkout && currentWorkout.exercises) {
            currentWorkout.exercises.forEach(exercise => {
                weeklySchedule[exercise.day].push({
                    name: exercise.name,
                    sets: exercise.sets,
                    reps: exercise.reps,
                    weight: exercise.weight,
                    duration: exercise.duration,
                    completed: exercise.completed
                });
            });
        }

        res.json({ weeklySchedule });
    } catch (error) {
        console.error('Error fetching workout data:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

const getNutritionData = async (req, res) => {
    try {
        if (!req.session.trainer) {
            console.log('Unauthorized access to nutrition data');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userId = req.params.userId;
        const trainerId = req.session.trainer.id;

        const user = await User.findOne({ 
            _id: userId, 
            trainer: trainerId,
            membershipType: 'Platinum'
        })
            .select('fitness_goals')
            .lean();

        if (!user) {
            console.log('Platinum user not found or not assigned to trainer:', userId);
            return res.status(404).json({ error: 'Client not found, not a Platinum member, or not assigned to you' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const latestNutrition = await NutritionHistory.findOne({
            userId: userId,
            date: { $gte: today, $lt: tomorrow }
        }).lean() || null;

        res.json({
            nutrition: {
                protein_goal: user.fitness_goals.protein_goal || 'N/A',
                calorie_goal: user.fitness_goals.calorie_goal || 'N/A',
                foods: latestNutrition ? latestNutrition.foods : [],
                macros: latestNutrition ? latestNutrition.macros : { protein: 0, carbs: 0, fats: 0 }
            }
        });
    } catch (error) {
        console.error('Error fetching nutrition data:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// REYNA
// Render trainer assignment page
const renderTrainerAssignment = async (req, res) => {
    try {
        if (!req.session.trainer) {
            console.log('Unauthorized access to trainer assignment');
            return res.redirect('/trainer_login');
        }

        const trainerId = req.session.trainer.id;
        const trainer = await Trainer.findById(trainerId);
        
        if (!trainer) {
            console.log('Trainer not found:', trainerId);
            return res.status(404).render('trainer', {
                errorMessage: 'Trainer not found'
            });
        }

        // Find unassigned users (trainer field is null) that match trainer's specializations
        const unassignedUsers = await User.find({
            trainer: null,
            workout_type: { $in: trainer.specializations },
            status: 'Active'
        }).select('full_name email workout_type dob weight height BMI fitness_goals created_at');

        res.render('trainer_assignment', {
            trainer: req.session.trainer,
            unassignedUsers: unassignedUsers || [],
            trainerSpecializations: trainer.specializations
        });
    } catch (error) {
        console.error('Error rendering trainer assignment page:', error);
        res.status(500).render('trainer', {
            errorMessage: 'Server error. Please try again later.'
        });
    }
};

// Assign user to trainer
const assignUserToTrainer = async (req, res) => {
    try {
        if (!req.session.trainer) {
            console.log('Unauthorized access to assign user');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { userId } = req.body;
        const trainerId = req.session.trainer.id;

        if (!userId) {
            console.log('Validation failed: User ID is required');
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Find user and trainer
        const user = await User.findById(userId);
        const trainer = await Trainer.findById(trainerId);

        if (!user) {
            console.log('User not found:', userId);
            return res.status(404).json({ error: 'User not found' });
        }

        if (!trainer) {
            console.log('Trainer not found:', trainerId);
            return res.status(404).json({ error: 'Trainer not found' });
        }

        // Check if user is already assigned
        if (user.trainer) {
            console.log('User already assigned to a trainer:', userId);
            return res.status(400).json({ error: 'User is already assigned to a trainer' });
        }

        // Check if workout type matches trainer's specializations
        if (!trainer.specializations.includes(user.workout_type)) {
            console.log('Workout type mismatch:', user.workout_type, trainer.specializations);
            return res.status(400).json({ error: 'User workout type does not match your specializations' });
        }

        // Assign user to trainer
        user.trainer = trainerId;
        await user.save();

        // Add user to trainer's clients array if not already there
        if (!trainer.clients.includes(userId)) {
            trainer.clients.push(userId);
            await trainer.save();
        }

        console.log('User assigned to trainer successfully:', userId, trainerId);
        res.json({ 
            success: true, 
            message: 'User assigned successfully',
            user: {
                id: user._id,
                name: user.full_name,
                workout_type: user.workout_type
            }
        });
    } catch (error) {
        console.error('Error assigning user to trainer:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get unassigned users by workout type
const getUnassignedUsers = async (req, res) => {
    try {
        if (!req.session.trainer) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const trainerId = req.session.trainer.id;
        const trainer = await Trainer.findById(trainerId);
        
        if (!trainer) {
            return res.status(404).json({ error: 'Trainer not found' });
        }

        const { workoutType } = req.query;
        let query = { trainer: null, status: 'Active' };

        // Filter by workout type if provided, otherwise show all matching trainer's specializations
        if (workoutType && workoutType !== 'all') {
            query.workout_type = workoutType;
        } else {
            query.workout_type = { $in: trainer.specializations };
        }

        const unassignedUsers = await User.find(query)
            .select('full_name email workout_type dob weight height BMI fitness_goals created_at')
            .sort({ created_at: -1 });

        res.json({ success: true, users: unassignedUsers });
    } catch (error) {
        console.error('Error fetching unassigned users:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
// END REYNA

module.exports = { 
    signupTrainer, 
    loginTrainer, 
    renderTrainerLogin, 
    renderTrainerDashboard, 
    renderEditWorkoutPlan, 
    saveWorkoutPlan, 
    renderEditNutritionPlan, 
    editNutritionPlan, 
    getClientData,
    getWorkoutData,
    getNutritionData,
    renderTrainerAssignment,    // REYNA
    assignUserToTrainer,        // REYNA
    getUnassignedUsers          // REYNA
};