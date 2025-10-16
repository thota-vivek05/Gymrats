const bcrypt = require('bcryptjs');
const TrainerApplication = require('../model/TrainerApplication');
const Trainer = require('../model/Trainer');
const User = require('../model/User');
const WorkoutHistory = require('../model/WorkoutHistory');
const NutritionHistory = require('../model/NutritionHistory');
const Exercise = require('../model/Exercise'); 
const UserExerciseRating = require('../model/UserExerciseRating'); // ADD THIS LINE

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

        // console.log('Trainer signup request received:', {
        //     firstName,
        //     lastName,
        //     email,
        //     phone,
        //     experience,
        //     specializations
        // });

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
            // console.log('Validation failed: Missing fields');
            return res.status(400).json({ error: 'All fields are required, including terms agreement' });
        }

        if (password !== confirmPassword) {
            // console.log('Validation failed: Passwords do not match');
            return res.status(400).json({ error: 'Passwords do not match' });
        }

        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(email)) {
            // console.log('Validation failed: Invalid email:', email);
            return res.status(400).json({ error: 'Invalid email address' });
        }

        const phoneRegex = /^\+?[\d\s-]{10,}$/;
        if (!phoneRegex.test(phone)) {
            // console.log('Validation failed: Invalid phone number:', phone);
            return res.status(400).json({ error: 'Invalid phone number' });
        }

        const validExperience = ['1-2', '3-5', '5-10', '10+'];
        if (!validExperience.includes(experience)) {
            // console.log('Validation failed: Invalid experience:', experience);
            return res.status(400).json({ error: 'Invalid experience selection' });
        }

        const validSpecializations = [
            'Calisthenics',
            'Weight Loss',
            'HIIT',
            'Competitive',
            'Strength Training',
            'Cardio',
            'Flexibility',
            'Bodybuilding'
        ];
        if (!Array.isArray(specializations) || specializations.length === 0) {
            // console.log('Validation failed: No specializations selected');
            return res.status(400).json({ error: 'At least one specialization must be selected' });
        }
        for (const spec of specializations) {
            if (!validSpecializations.includes(spec)) {
                // console.log('Validation failed: Invalid specialization:', spec);
                return res.status(400).json({ error: `Invalid specialization: ${spec}` });
            }
        }

        const existingApplication = await TrainerApplication.findOne({ email });
        if (existingApplication) {
            // console.log('Validation failed: Email already registered:', email);
            return res.status(400).json({ error: 'Email already registered' });
        }

        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);
        // console.log('Password hashed for:', email);

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
        // console.log('New trainer application created:', newApplication);

        await newApplication.save();
        // console.log('Trainer application saved to MongoDB:', email);

        if (req.session) {
            req.session.trainerApplication = {
                id: newApplication._id,
                email: newApplication.email,
                firstName: newApplication.firstName,
                lastName: newApplication.lastName
            };
            // console.log('Session set for trainer application:', email);
        }

        res.status(201).json({ message: 'Trainer application submitted successfully', redirect: '/trainer_login' });
    } catch (error) {
        console.error('Trainer signup error:', error);
        if (error.code === 11000) {
            // console.log('MongoDB error: Duplicate email:', email);
            return res.status(400).json({ error: 'Email already registered' });
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            // console.log('MongoDB validation errors:', messages);
            return res.status(400).json({ error: messages.join(', ') });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

const loginTrainer = async (req, res) => {
    try {
        const { email, password } = req.body;

        // console.log('Trainer login request received:', { email });

        if (!email || !password) {
            // console.log('Validation failed: Missing email or password');
            return res.status(400).render('trainer_login', {
                errorMessage: 'Email and password are required',
                email
            });
        }

        const trainer = await Trainer.findOne({ email });
        if (!trainer) {
            // console.log('Trainer not found:', email);
            return res.status(401).render('trainer_login', {
                errorMessage: 'Invalid email or password',
                email
            });
        }

        if (trainer.status !== 'Active') {
            // console.log('Trainer account not active:', email, trainer.status);
            return res.status(403).render('trainer_login', {
                errorMessage: `Your account is ${trainer.status.toLowerCase()}. Please contact support.`,
                email
            });
        }

        const isMatch = await bcrypt.compare(password, trainer.password_hash);
        if (!isMatch) {
            // console.log('Invalid password for:', email);
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
        //  console.log('Session set for trainer:', email);

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
            //  console.log('Unauthorized access to trainer dashboard');
            return res.redirect('/trainer_login');
        }

        const trainerId = req.session.trainer.id;
        //  console.log('Fetching ALL users for trainer:', trainerId);

        // Fetch trainer details
        const trainer = await Trainer.findById(trainerId);
      
        // Fetch ALL users assigned to this trainer (Basic, Gold, Platinum)
        const users = await User.find({ 
            trainer: trainerId, 
            status: 'Active'
        })
            .select('full_name dob weight height BMI fitness_goals class_schedules membershipType') // ADD membershipType here
            .lean();

        //  console.log('Found users:', users.length);
        //  console.log('Membership breakdown:', users.map(u => u.membershipType));
        // Add this //  console.log in both functions to debug
//         console.log('User membership data:', users.map(u => ({
//     name: u.full_name,
//     membership: u.membershipType
// })));

        const clients = users.map(user => {
            const progress = 0;

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
                membershipType: user.membershipType || 'Basic', // FIX: Use actual membershipType
                progress,
                nextSession: nextSessionDate,
                age: isNaN(age) ? 'N/A' : age,
                weight: user.weight ? `${user.weight} kg` : 'N/A',
                height: user.height ? `${user.height} cm` : 'N/A',
                bodyFat: user.BMI ? `${user.BMI.toFixed(1)} (BMI)` : 'N/A',
                goal: fitnessGoal
            };
        });

         const requestedClientId = req.query.clientId;

         let selectedClient = null;
        if (requestedClientId) {
            selectedClient = clients.find(client => client.id === requestedClientId);
        }
        if (!selectedClient && clients.length > 0) {
            selectedClient = clients[0]; // Fallback to first client
        }


        // ... rest of the function remains the same

        // Fetch data for the first client (if available) - FIXED VERSION
        // let selectedClient = clients.length > 0 ? clients[0] : null;
        let nutritionData = null;
        let workoutData = null;

        // Replace the nutrition data fetching section with this:

if (selectedClient) {
    try {
        // ✅ FIXED: Use same week calculation as nutrition saving
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const weekStart = new Date(today);
        const dayOfWeek = today.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        weekStart.setDate(today.getDate() + diffToMonday);
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        // ✅ FIXED: Fetch weekly nutrition data (not daily)
        const weeklyNutrition = await NutritionHistory.findOne({
            userId: selectedClient.id,
            date: { $gte: weekStart, $lt: weekEnd }
        }).lean();

        // ✅ FIXED: Get today's nutrition from the weekly data
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayName = days[today.getDay()];
        
        let todayNutrition = null;
        if (weeklyNutrition && weeklyNutrition.daily_nutrition) {
            todayNutrition = weeklyNutrition.daily_nutrition[todayName];
        }

        nutritionData = {
            nutrition: {
                protein_goal: users.find(u => u._id.toString() === selectedClient.id)?.fitness_goals?.protein_goal || 'N/A',
                calorie_goal: users.find(u => u._id.toString() === selectedClient.id)?.fitness_goals?.calorie_goal || 'N/A',
                foods: todayNutrition ? todayNutrition.foods : [],
                macros: todayNutrition ? todayNutrition.macros : { protein: 0, carbs: 0, fats: 0 }
            }
        };

        // ... rest of your workout data code remains the same
    } catch (dataError) {
        console.error('Error fetching client data:', dataError);
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
            //  console.log('Unauthorized access to edit workout plan');
            return res.redirect('/trainer_login');
        }

        const userId = req.params.userId;
        const trainerId = req.session.trainer.id;

        const user = await User.findOne({ 
            _id: userId, 
            trainer: trainerId,
            // membershipType: 'Platinum'
            membershipType: { $in: ['Platinum', 'Gold', 'Basic'] }
        })
            .select('full_name fitness_goals')
            .lean();

        if (!user) {
            //  console.log('Platinum user not found or not assigned to trainer:', userId);
            return res.status(404).render('trainer', {
                errorMessage: 'Client not found, not a Platinum member, or not assigned to you'
            });
        }

        // ✅ FIX: Fetch all exercises from database
        const exercises = await Exercise.find({ verified: true })
            .select('name category difficulty targetMuscles type defaultSets defaultRepsOrDuration')
            .sort({ name: 1 })
            .lean();

        // ✅ FIXED: Consistent date calculation with saveWorkoutPlan
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const weekStart = new Date(today);
        const dayOfWeek = today.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        weekStart.setDate(today.getDate() + diffToMonday);
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        const currentWorkout = await WorkoutHistory.findOne({
            userId: userId,
            date: { $gte: weekStart, $lt: weekEnd }
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
            notes: currentWorkout ? currentWorkout.notes : '',
            exercises: exercises
        });
    } catch (error) {
        console.error('Error rendering edit workout plan:', error);
        res.redirect('/trainer?error=Failed to load workout plan editor');
    }
};

const saveWorkoutPlan = async (req, res) => {
    try {
        if (!req.session.trainer) {
            //  console.log('Unauthorized access to save workout plan');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { clientId, notes, currentWeek } = req.body;
        const trainerId = req.session.trainer.id;

        //  console.log('Saving workout plan for Platinum user:', clientId);
        //  console.log('=== DEBUG: Received currentWeek data ===');
        //  console.log(JSON.stringify(currentWeek, null, 2));

        if (!clientId || !currentWeek) {
            //  console.log('Validation failed: Missing required fields');
            return res.status(400).json({ error: 'Client ID and current week data are required' });
        }

        const user = await User.findOne({ 
            _id: clientId, 
            trainer: trainerId,
            // membershipType: 'Platinum'
            membershipType: { $in: ['Platinum', 'Gold', 'Basic'] }
        });
        if (!user) {
            //  console.log('Platinum user not found or not assigned to trainer:', clientId);
            return res.status(404).json({ error: 'Client not found, not a Platinum member, or not assigned to you' });
        }

        // ✅ FIXED: Better date calculation for the current week
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Get start of current week (Monday)
        const weekStart = new Date(today);
        const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Monday start
        weekStart.setDate(today.getDate() + diffToMonday);
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        weekEnd.setHours(23, 59, 59, 999);

        //  console.log('=== DEBUG: Date Range ===');
        //  console.log('Week Start:', weekStart);
        //  console.log('Week End:', weekEnd);
        //  console.log('Today:', today);

        const currentWeekExercises = [];
        for (const [day, exercises] of Object.entries(currentWeek)) {
            //  console.log(`=== DEBUG: Processing ${day} ===`);
            exercises.forEach(ex => {
                //  console.log('Exercise data:', ex);
                
                if (ex.name && ex.name.trim()) {
                    const processedExercise = {
                        day,
                        name: ex.name,
                        sets: ex.sets ? parseInt(ex.sets) : null,
                        reps: ex.reps ? parseInt(ex.reps) : null,
                        weight: ex.weight ? parseFloat(ex.weight) : null,
                        duration: ex.duration ? parseInt(ex.duration) : null,
                        completed: false
                    };
                    //  console.log('Processed exercise:', processedExercise);
                    currentWeekExercises.push(processedExercise);
                }
            });
        }

        // ✅ FIXED: Find existing workout for this week and UPDATE it instead of creating new
        let workout = await WorkoutHistory.findOne({
            userId: clientId,
            date: { $gte: weekStart, $lt: weekEnd }
        });

        if (workout) {
            // ✅ UPDATE existing workout document
            workout.exercises = currentWeekExercises;
            workout.notes = notes || '';
            workout.updatedAt = new Date();
            await workout.save();
            //  console.log('✅ EXISTING workout document UPDATED for week:', weekStart);
        } else {
            // ✅ CREATE new workout document only if it doesn't exist for this week
            workout = new WorkoutHistory({
                userId: clientId,
                date: weekStart, // Use week start as the date
                exercises: currentWeekExercises,
                progress: 0,
                completed: false,
                notes: notes || ''
            });
            await workout.save();
            //  console.log('✅ NEW workout document CREATED for week:', weekStart);
        }

        //  console.log('Workout saved successfully:', workout._id);

        // ✅ FIXED: Update user's workout_history to include only the current week's workout
        // Remove any old workout history entries for the same week
        const userWorkoutHistory = await WorkoutHistory.find({
            userId: clientId,
            date: { $gte: weekStart, $lt: weekEnd },
            _id: { $ne: workout._id } // Exclude current workout
        });

        // Delete duplicate workouts for the same week
        if (userWorkoutHistory.length > 0) {
            await WorkoutHistory.deleteMany({
                userId: clientId,
                date: { $gte: weekStart, $lt: weekEnd },
                _id: { $ne: workout._id }
            });
            //  console.log(`Deleted ${userWorkoutHistory.length} duplicate workout entries for the same week`);
        }

        // Update user's workout_history array to include only current week workout
        user.workout_history = [workout._id];
        await user.save();
        //  console.log('User workout history updated - only current week workout kept');

        res.json({ 
            message: 'Workout plan saved successfully',  
            redirect: `/trainer?clientId=${clientId}` 
        });

    } catch (error) {
        console.error('Error saving workout plan:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
};

const renderEditNutritionPlan = async (req, res) => {
    try {
        if (!req.session.trainer) {
            //  console.log('Unauthorized access to edit nutrition plan');
            return res.redirect('/trainer_login');
        }

        const userId = req.params.userId;
        const trainerId = req.session.trainer.id;

        const user = await User.findOne({ 
            _id: userId, 
            trainer: trainerId,
           // membershipType: 'Platinum'
           membershipType: { $in: ['Platinum', 'Gold'] }
        })
            .select('full_name fitness_goals')
            .lean();

        if (!user) {
            //  console.log('Platinum user not found or not assigned to trainer:', userId);
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
            //  console.log('Unauthorized access to save nutrition plan');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { userId, proteinGoal, calorieGoal, foods, day } = req.body; // ✅ ADDED 'day' parameter
        const trainerId = req.session.trainer.id;

        //  console.log('Saving nutrition plan for Platinum user:', userId);
        //  console.log('Day:', day); // ✅ Log which day we're saving for

        if (!userId || !proteinGoal || !calorieGoal || !Array.isArray(foods) || !day) {
            //  console.log('Validation failed: Missing required fields');
            return res.status(400).json({ error: 'All fields are required, including day' });
        }

        const user = await User.findOne({ 
            _id: userId, 
            trainer: trainerId,
            // membershipType: 'Platinum'
            membershipType: { $in: ['Platinum', 'Gold'] }
        });
        if (!user) {
            //  console.log('Platinum user not found or not assigned to trainer:', userId);
            return res.status(404).json({ error: 'Client not found, not a Platinum member, or not assigned to you' });
        }

        // ✅ FIXED: Use same week calculation as workouts
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const weekStart = new Date(today);
        const dayOfWeek = today.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        weekStart.setDate(today.getDate() + diffToMonday);
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        //  console.log('=== NUTRITION DEBUG: Week Range ===');
        //  console.log('Week Start:', weekStart);
        //  console.log('Week End:', weekEnd);
        //  console.log('Saving for day:', day);

        // ✅ FIXED: Always create NEW weekly nutrition document (like workouts)
        let weeklyNutrition = await NutritionHistory.findOne({
            userId: userId,
            date: { $gte: weekStart, $lt: weekEnd }
        });

        // Calculate nutrition data for the specific day
        const dayCalories = foods.reduce((sum, food) => sum + (food.calories || 0), 0);
        const dayProtein = foods.reduce((sum, food) => sum + (food.protein || 0), 0);
        const dayCarbs = foods.reduce((sum, food) => sum + (food.carbs || 0), 0);
        const dayFats = foods.reduce((sum, food) => sum + (food.fats || 0), 0);

        const dayNutritionData = {
            calories_consumed: dayCalories,
            protein_consumed: dayProtein,
            foods: foods.map(food => ({
                name: food.name,
                protein: food.protein || 0,
                calories: food.calories || 0,
                carbs: food.carbs || 0,
                fats: food.fats || 0
            })),
            macros: {
                protein: dayProtein,
                carbs: dayCarbs,
                fats: dayFats
            }
        };

        if (weeklyNutrition) {
            // Update existing weekly nutrition - only update the specific day
            weeklyNutrition.daily_nutrition[day] = dayNutritionData;
            //  console.log(`Updated nutrition for ${day} in existing weekly document`);
        } else {
            // Create new weekly nutrition document
            weeklyNutrition = new NutritionHistory({
                userId: userId,
                date: weekStart,
                protein_goal: parseInt(proteinGoal),
                calorie_goal: parseInt(calorieGoal),
                daily_nutrition: {
                    Monday: day === 'Monday' ? dayNutritionData : { calories_consumed: 0, protein_consumed: 0, foods: [], macros: { protein: 0, carbs: 0, fats: 0 } },
                    Tuesday: day === 'Tuesday' ? dayNutritionData : { calories_consumed: 0, protein_consumed: 0, foods: [], macros: { protein: 0, carbs: 0, fats: 0 } },
                    Wednesday: day === 'Wednesday' ? dayNutritionData : { calories_consumed: 0, protein_consumed: 0, foods: [], macros: { protein: 0, carbs: 0, fats: 0 } },
                    Thursday: day === 'Thursday' ? dayNutritionData : { calories_consumed: 0, protein_consumed: 0, foods: [], macros: { protein: 0, carbs: 0, fats: 0 } },
                    Friday: day === 'Friday' ? dayNutritionData : { calories_consumed: 0, protein_consumed: 0, foods: [], macros: { protein: 0, carbs: 0, fats: 0 } },
                    Saturday: day === 'Saturday' ? dayNutritionData : { calories_consumed: 0, protein_consumed: 0, foods: [], macros: { protein: 0, carbs: 0, fats: 0 } },
                    Sunday: day === 'Sunday' ? dayNutritionData : { calories_consumed: 0, protein_consumed: 0, foods: [], macros: { protein: 0, carbs: 0, fats: 0 } }
                }
            });
            //  console.log('✅ NEW weekly nutrition document created for week:', weekStart);
        }

        // Calculate weekly averages for macros
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        let totalProtein = 0, totalCarbs = 0, totalFats = 0;
        let dayCount = 0;

        days.forEach(dayName => {
            if (weeklyNutrition.daily_nutrition[dayName].foods.length > 0) {
                totalProtein += weeklyNutrition.daily_nutrition[dayName].macros.protein;
                totalCarbs += weeklyNutrition.daily_nutrition[dayName].macros.carbs;
                totalFats += weeklyNutrition.daily_nutrition[dayName].macros.fats;
                dayCount++;
            }
        });

        weeklyNutrition.weekly_macros = {
            protein: dayCount > 0 ? Math.round(totalProtein / dayCount) : 0,
            carbs: dayCount > 0 ? Math.round(totalCarbs / dayCount) : 0,
            fats: dayCount > 0 ? Math.round(totalFats / dayCount) : 0
        };

        await weeklyNutrition.save();
        //  console.log('Weekly nutrition saved successfully:', weeklyNutrition._id);

        // ✅ FIXED: REPLACE user's nutrition_history with only current week's nutrition
        user.nutrition_history = [weeklyNutrition._id];
        await user.save();
        //  console.log('User nutrition history updated - only current week nutrition kept');

        // Update user fitness goals
        user.fitness_goals.protein_goal = parseInt(proteinGoal);
        user.fitness_goals.calorie_goal = parseInt(calorieGoal);
        await user.save();
        
        //  console.log('Nutrition plan and goals saved for Platinum user:', userId);

        res.json({ message: 'Nutrition plan saved successfully', redirect: `/trainer?clientId=${userId}` });
    } catch (error) {
        console.error('Error saving nutrition plan:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
};

const getClientData = async (req, res) => {
    try {
        const userId = req.params.id;
        const trainerId = req.session.trainer.id;
        const user = await User.findOne({ 
            _id: userId, 
            trainer: trainerId
        })
            .select('full_name dob weight height BMI fitness_goals membershipType') // ADD membershipType here
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
            goal: fitnessGoal,
            membershipType: user.membershipType || 'Basic', // ADD this line
            id: user._id // ADD this too for the edit links
        });
    } catch (error) {
        console.error('Error fetching client data:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

const getWorkoutData = async (req, res) => {
    try {
        if (!req.session.trainer) {
            //  console.log('Unauthorized access to workout data');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userId = req.params.userId;
        const trainerId = req.session.trainer.id;

        const user = await User.findOne({ 
            _id: userId, 
            trainer: trainerId,
            // membershipType: 'Platinum'
            membershipType: { $in: ['Platinum', 'Gold', 'Basic'] }
        }).lean();

        if (!user) {
            //  console.log('Platinum user not found or not assigned to trainer:', userId);
            return res.status(404).json({ error: 'Client not found, not a Platinum member, or not assigned to you' });
        }

        // ✅ FIXED: Use same Monday-start week calculation as saveWorkoutPlan
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const weekStart = new Date(today);
        const dayOfWeek = today.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        weekStart.setDate(today.getDate() + diffToMonday);
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        const currentWorkout = await WorkoutHistory.findOne({
            userId: userId,
            date: { $gte: weekStart, $lt: weekEnd }
        }).lean() || null;

        // ✅ FIXED: Ensure consistent weeklySchedule structure
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

        // ✅ FIXED: Return the exact structure expected by frontend
        res.json({ 
            weeklySchedule: weeklySchedule,
            success: true 
        });
    } catch (error) {
        console.error('Error fetching workout data:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Add this function to trainerController.js
// Add this function to trainerController.js
const getClientExerciseRatings = async (req, res) => {
    try {
        if (!req.session.trainer) {
            //  console.log('Unauthorized access to exercise ratings');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userId = req.params.userId;
        const trainerId = req.session.trainer.id;

        const user = await User.findOne({ 
            _id: userId, 
            trainer: trainerId
        }).lean();

        if (!user) {
            //  console.log('User not found or not assigned to trainer:', userId);
            return res.status(404).json({ error: 'Client not found or not assigned to you' });
        }

        // Fetch exercise ratings for this user, sorted by rating descending
        const exerciseRatings = await UserExerciseRating.find({ userId: userId })
            .populate('exerciseId', 'name category difficulty targetMuscles')
            .sort({ rating: -1, createdAt: -1 })
            .lean();

        //  console.log(`Found ${exerciseRatings.length} exercise ratings for user:`, userId);

        // Format the response
        const formattedRatings = exerciseRatings.map(rating => ({
            exerciseName: rating.exerciseId?.name || 'Unknown Exercise',
            category: rating.exerciseId?.category || 'Unknown',
            difficulty: rating.exerciseId?.difficulty || 'Unknown',
            targetMuscles: rating.exerciseId?.targetMuscles || [],
            rating: rating.rating,
            effectiveness: rating.effectiveness,
            workoutType: rating.workoutType,
            notes: rating.notes,
            lastRated: rating.updatedAt
        }));

        res.json({
            success: true,
            ratings: formattedRatings
        });
    } catch (error) {
        console.error('Error fetching exercise ratings:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

const getNutritionData = async (req, res) => {
    try {
        if (!req.session.trainer) {
            //  console.log('Unauthorized access to nutrition data');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userId = req.params.userId;
        const trainerId = req.session.trainer.id;

        const user = await User.findOne({ 
            _id: userId, 
            trainer: trainerId,
            // membershipType: 'Platinum'
            membershipType: { $in: ['Platinum', 'Gold'] }
        })
            .select('fitness_goals')
            .lean();

        if (!user) {
            //  console.log('Platinum user not found or not assigned to trainer:', userId);
            return res.status(404).json({ error: 'Client not found, not a Platinum member, or not assigned to you' });
        }

        // ✅ FIXED: Use same week calculation
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const weekStart = new Date(today);
        const dayOfWeek = today.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        weekStart.setDate(today.getDate() + diffToMonday);
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        const weeklyNutrition = await NutritionHistory.findOne({
            userId: userId,
            date: { $gte: weekStart, $lt: weekEnd }
        }).lean();

        // ✅ FIXED: Get today's nutrition from weekly data
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayName = days[today.getDay()];
        
        let todayNutrition = null;
        if (weeklyNutrition && weeklyNutrition.daily_nutrition) {
            todayNutrition = weeklyNutrition.daily_nutrition[todayName];
        }

        res.json({
            nutrition: {
                protein_goal: user.fitness_goals.protein_goal || 'N/A',
                calorie_goal: user.fitness_goals.calorie_goal || 'N/A',
                foods: todayNutrition ? todayNutrition.foods : [],
                macros: todayNutrition ? todayNutrition.macros : { protein: 0, carbs: 0, fats: 0 }
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
            //  console.log('Unauthorized access to trainer assignment');
            return res.redirect('/trainer_login');
        }

        const trainerId = req.session.trainer.id;
        const trainer = await Trainer.findById(trainerId);
        
        if (!trainer) {
            //  console.log('Trainer not found:', trainerId);
            return res.status(404).render('trainer', {
                errorMessage: 'Trainer not found'
            });
        }

        // Find unassigned users (trainer field is null) that match trainer's specializations
        const unassignedUsers = await User.find({
            trainer: null,
            workout_type: { $in: trainer.specializations },
            status: 'Active'
        }).select('full_name email workout_type dob weight height BMI fitness_goals created_at membershipType'); // ADD membershipType

        //  console.log('Unassigned users found:', unassignedUsers.length);
        //  console.log('Membership types:', unassignedUsers.map(u => u.membershipType));
        // Add this //  console.log in both functions to debug
//  console.log('User membership data:', unassignedUsers.map(u => ({
//     name: u.full_name,
//     membership: u.membershipType
// })));

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
            //  console.log('Unauthorized access to assign user');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { userId } = req.body;
        const trainerId = req.session.trainer.id;

        if (!userId) {
            //  console.log('Validation failed: User ID is required');
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Find user and trainer
        const user = await User.findById(userId);
        const trainer = await Trainer.findById(trainerId);

        if (!user) {
            //  console.log('User not found:', userId);
            return res.status(404).json({ error: 'User not found' });
        }

        if (!trainer) {
            //  console.log('Trainer not found:', trainerId);
            return res.status(404).json({ error: 'Trainer not found' });
        }

        // Check if user is already assigned
        if (user.trainer) {
            //  console.log('User already assigned to a trainer:', userId);
            return res.status(400).json({ error: 'User is already assigned to a trainer' });
        }

        // Check if workout type matches trainer's specializations
        if (!trainer.specializations.includes(user.workout_type)) {
            //  console.log('Workout type mismatch:', user.workout_type, trainer.specializations);
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

        //  console.log('User assigned to trainer successfully:', userId, trainerId);
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

        if (workoutType && workoutType !== 'all') {
            query.workout_type = workoutType;
        } else {
            query.workout_type = { $in: trainer.specializations };
        }

        const unassignedUsers = await User.find(query)
            .select('full_name email workout_type dob weight height BMI fitness_goals created_at membershipType') // ADD membershipType
            .sort({ created_at: -1 });

        //  console.log('API - Unassigned users:', unassignedUsers.length);
        //  console.log('API - Membership types:', unassignedUsers.map(u => u.membershipType));

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
    getUnassignedUsers,          // REYNA
    getClientExerciseRatings 
};
