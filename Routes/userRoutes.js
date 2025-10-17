const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// REYNA
const membershipController = require('../controllers/membershipController'); // ADD THIS

// Add this import at the top with other imports
const NutritionHistory = require('../model/NutritionHistory');

const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    res.redirect('/login_signup?form=login');
};

router.get('/login_signup', (req, res) => {
    res.render('login_signup', { form: req.query.form || 'login' });
});

// Route for user dashboard with dynamic type (b, g, or p)
// added checkactivemembership (for months left)              REYNA
router.get('/userdashboard_:type', userController.checkMembershipActive, (req, res, next) => {
    const dashboardType = req.params.type; // Extract 'b', 'g', or 'p' from URL
    userController.getUserDashboard(req, res, dashboardType);
});

router.post('/login', userController.loginUser);
router.post('/signup', userController.signupUser);
router.get('/profile', userController.getUserProfile);
router.post('/complete-workout', userController.completeWorkout);
router.post('/api/workout/complete', userController.markWorkoutCompleted);

// Individual exercise completion route
router.post('/api/exercise/complete', userController.checkMembershipActive, isAuthenticated, userController.markExerciseCompleted);
// Add this temporary debug route to userRoutes.js
router.get('/api/debug/workout/:id', async (req, res) => {
    try {
        const workout = await WorkoutHistory.findById(req.params.id);
        res.json({
            workout: workout,
            exercises: workout?.exercises?.map(ex => ({
                name: ex.name,
                completed: ex.completed,
                _id: ex._id
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Add to userRoutes.js
router.get('/api/debug/workouts', userController.checkMembershipActive, isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const workouts = await WorkoutHistory.find({ userId: userId });
        
        const today = new Date();
        const todayDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getUTCDay()];
        
        res.json({
            userId: userId,
            today: todayDayName,
            totalWorkouts: workouts.length,
            workouts: workouts.map(w => ({
                id: w._id,
                date: w.date,
                exercises: w.exercises ? w.exercises.map(e => ({
                    name: e.name,
                    day: e.day,
                    completed: e.completed
                })) : [],
                exercisesForToday: w.exercises ? w.exercises.filter(e => e.day === todayDayName) : []
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Membership management routes
router.post('/membership/extend', membershipController.extendMembership);
router.get('/membership/status', membershipController.getMembershipStatus);
router.post('/membership/auto-renew', membershipController.toggleAutoRenew);
//brimstone
router.post('/user/membership/change', isAuthenticated, userController.changeMembership);
//brimstone
router.get('/membership_renewal', isAuthenticated, (req, res) => {
    res.render('membership_renewal', { 
        user: req.session.user 
    });
});

// For nutrition page
router.get('/user_nutrition', userController.checkMembershipActive, isAuthenticated, (req, res) => {
    res.render('user_nutrition', { 
        user: req.session.user,
        currentPage: 'nutrition'
    });
});

// For exercise page
// Update in Routes/userRoutes.js - the existing user_exercises route
router.get('/user_exercises', userController.checkMembershipActive, isAuthenticated, async (req, res) => {
    try {
        const User = require('../model/User');
        const user = await User.findById(req.session.user.id);
        
        res.render('user_exercises', { 
            user: {
                ...req.session.user,
                workout_type: user?.workout_type
            },
            currentPage: 'exercises'
        });
    } catch (error) {
        console.error('Error loading exercises page:', error);
        res.render('user_exercises', { 
            user: req.session.user,
            currentPage: 'exercises'
        });
    }
});

// OMEN user rating system

// Add to Routes/userRoutes.js (after the existing routes)
const Exercise = require('../model/Exercise');
const UserExerciseRating = require('../model/UserExerciseRating');

// Get exercises based on user's workout type
router.get('/api/exercises', userController.checkMembershipActive, isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const User = require('../model/User');
        const user = await User.findById(userId);
        
        let query = { verified: true };
        
        // Filter by user's workout type if set
        if (user && user.workout_type) {
            query.category = user.workout_type;
        }
        
        const exercises = await Exercise.find(query).sort({ name: 1 });
        
        // Get user's ratings for these exercises
        const userRatings = await UserExerciseRating.find({ 
            userId: userId,
            exerciseId: { $in: exercises.map(ex => ex._id) }
        });
        
        const ratingsMap = {};
        userRatings.forEach(rating => {
            ratingsMap[rating.exerciseId.toString()] = rating.rating;
        });
        
        // Add user's rating to each exercise
        const exercisesWithRatings = exercises.map(exercise => ({
            ...exercise.toObject(),
            userRating: ratingsMap[exercise._id.toString()] || null,
            hasRated: !!ratingsMap[exercise._id.toString()]
        }));
        
        res.json({ 
            success: true, 
            exercises: exercisesWithRatings,
            userWorkoutType: user?.workout_type || 'All'
        });
    } catch (error) {
        console.error('Error fetching exercises:', error);
        res.status(500).json({ success: false, message: 'Error fetching exercises' });
    }
});

// Rate an exercise
router.post('/api/exercises/:exerciseId/rate', userController.checkMembershipActive, isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { exerciseId } = req.params;
        const { rating, effectiveness, notes } = req.body;
        
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
        }
        
        const User = require('../model/User');
        const user = await User.findById(userId);
        const exercise = await Exercise.findById(exerciseId);
        
        if (!exercise) {
            return res.status(404).json({ success: false, message: 'Exercise not found' });
        }
        
        // Create or update rating
        const userRating = await UserExerciseRating.findOneAndUpdate(
            { userId, exerciseId },
            {
                rating,
                effectiveness: effectiveness || 'Neutral',
                notes: notes || '',
                workoutType: user?.workout_type || exercise.category
            },
            { upsert: true, new: true }
        );
        
        // Update exercise average rating
        const allRatings = await UserExerciseRating.find({ exerciseId });
        const averageRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;
        
        await Exercise.findByIdAndUpdate(exerciseId, {
            averageRating: Math.round(averageRating * 10) / 10,
            totalRatings: allRatings.length
        });
        
        // Update user preferences
        if (rating >= 4) {
            await User.findByIdAndUpdate(userId, {
                $addToSet: { 
                    'exercisePreferences.preferredCategories': exercise.category,
                    'exercisePreferences.favoriteExercises': {
                        exerciseId: exercise._id,
                        rating: rating
                    }
                },
                $set: { 'exercisePreferences.lastRatedAt': new Date() }
            });
        }
        
        res.json({ 
            success: true, 
            message: 'Exercise rated successfully',
            rating: userRating,
            exercise: {
                averageRating: Math.round(averageRating * 10) / 10,
                totalRatings: allRatings.length
            }
        });
    } catch (error) {
        console.error('Error rating exercise:', error);
        res.status(500).json({ success: false, message: 'Error rating exercise' });
    }
});

// Get recommended exercises based on user ratings
// Get recommended exercises based on user ratings - FIXED VERSION
// Get recommended exercises based on user ratings
router.get('/api/exercises/recommended', userController.checkMembershipActive, isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const User = require('../model/User');
        const user = await User.findById(userId);
        const userWorkoutType = user?.workout_type;

        // Get user's highly rated exercises (if any)
        const highRatedExercises = await UserExerciseRating.find({ 
            userId, 
            rating: { $gte: 4 } 
        }).populate('exerciseId');

        let recommendedExercises = [];
        let reason = '';

        if (highRatedExercises.length > 0) {
            // FIX: Filter out null exerciseId values before mapping
            const validHighRatedExercises = highRatedExercises.filter(r => r.exerciseId !== null);
            
            // FIX: Add null check in map functions
            const preferredCategories = [...new Set(validHighRatedExercises.map(r => r.exerciseId?.category).filter(Boolean))];
            const preferredMovementPatterns = [...new Set(validHighRatedExercises.map(r => r.exerciseId?.movementPattern).filter(Boolean))];
            const preferredPrimaryMuscles = [...new Set(validHighRatedExercises.map(r => r.exerciseId?.primaryMuscle).filter(Boolean))];

            // FIX: Use validHighRatedExercises instead of highRatedExercises
            recommendedExercises = await Exercise.find({
                verified: true,
                _id: { $nin: validHighRatedExercises.map(r => r.exerciseId._id) },
                $or: [
                    { category: { $in: preferredCategories } },
                    { movementPattern: { $in: preferredMovementPatterns } },
                    { primaryMuscle: { $in: preferredPrimaryMuscles } }
                ]
            }).limit(8);

            reason = 'similar_to_your_high_rated_exercises';
        } else {
            // No ratings yet - show diverse recommendations
            // Get mix of user's workout type + other popular exercises
            const userWorkoutExercises = userWorkoutType 
                ? await Exercise.find({ 
                    verified: true,
                    category: userWorkoutType 
                  }).limit(4)
                : [];

            // Get popular exercises from other categories
            const otherCategoriesExercises = await Exercise.find({
                verified: true,
                category: { $ne: userWorkoutType } // Exclude user's workout type
            })
            .limit(4)
            .sort({ averageRating: -1, usageCount: -1 });

            // Combine and shuffle for variety
            recommendedExercises = [...userWorkoutExercises, ...otherCategoriesExercises]
                .sort(() => Math.random() - 0.5) // Shuffle the array
                .slice(0, 6); // Take 6 exercises

            reason = userWorkoutType 
                ? `mix_of_${userWorkoutType.toLowerCase()}_and_popular_exercises`
                : 'popular_exercises_from_all_categories';
        }

        // If we still don't have enough exercises, fill with random verified ones
        if (recommendedExercises.length < 6) {
            const additionalExercises = await Exercise.find({
                verified: true,
                _id: { $nin: recommendedExercises.map(e => e._id) }
            })
            .limit(6 - recommendedExercises.length)
            .sort({ averageRating: -1 });

            recommendedExercises = [...recommendedExercises, ...additionalExercises];
        }

        // Final sort: user's workout type exercises first, then by rating
        if (userWorkoutType) {
            recommendedExercises.sort((a, b) => {
                const aIsUserType = a.category === userWorkoutType;
                const bIsUserType = b.category === userWorkoutType;
                
                if (aIsUserType && !bIsUserType) return -1;
                if (!aIsUserType && bIsUserType) return 1;
                
                // If same category priority, sort by rating
                return (b.averageRating || 0) - (a.averageRating || 0);
            });
        }

        res.json({ 
            success: true, 
            exercises: recommendedExercises,
            reason: reason,
            userWorkoutType: userWorkoutType
        });

    } catch (error) {
        console.error('Error fetching recommended exercises:', error);
        res.status(500).json({ success: false, message: 'Error fetching recommendations' });
    }
});

// Get exercise details
router.get('/api/exercises/:exerciseId', userController.checkMembershipActive, isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { exerciseId } = req.params;
        
        const exercise = await Exercise.findById(exerciseId);
        if (!exercise) {
            return res.status(404).json({ success: false, message: 'Exercise not found' });
        }
        
        // Get user's rating for this exercise
        const userRating = await UserExerciseRating.findOne({ userId, exerciseId });
        
        // Get similar exercises
        const similarExercises = await Exercise.find({
            verified: true,
            _id: { $ne: exerciseId },
            $or: [
                { category: exercise.category },
                { movementPattern: exercise.movementPattern },
                { primaryMuscle: exercise.primaryMuscle }
            ]
        }).limit(4);
        
        res.json({ 
            success: true, 
            exercise: {
                ...exercise.toObject(),
                userRating: userRating?.rating || null,
                userEffectiveness: userRating?.effectiveness || null,
                userNotes: userRating?.notes || null
            },
            similarExercises
        });
    } catch (error) {
        console.error('Error fetching exercise details:', error);
        res.status(500).json({ success: false, message: 'Error fetching exercise details' });
    }
});

// Add this route for debugging
router.get('/api/debug/exercises-test', userController.checkMembershipActive, isAuthenticated, async (req, res) => {
    try {
        //  console.log('=== DEBUG EXERCISES API ===');
        
        const userId = req.session.user.id;
        //  console.log('User ID:', userId);
        
        const User = require('../model/User');
        const user = await User.findById(userId);
        //  console.log('User workout_type:', user?.workout_type);
        
        // Test the exact query
        let query = { verified: true };
        if (user && user.workout_type) {
            query.category = user.workout_type;
        }
        
        //  console.log('Query:', query);
        
        const exercises = await Exercise.find(query).sort({ name: 1 });
        //  console.log('Found exercises:', exercises.length);
        //  console.log('Exercise names:', exercises.map(e => e.name));
        
        res.json({
            success: true,
            query: query,
            exerciseCount: exercises.length,
            exercises: exercises,
            userWorkoutType: user?.workout_type || 'All'
        });
        
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Search exercises
router.get('/api/exercises/search', userController.checkMembershipActive, isAuthenticated, async (req, res) => {
    try {
        const { query } = req.query;
        const userId = req.session.user.id;
        
        if (!query || query.trim() === '') {
            return res.json({ success: true, exercises: [] });
        }
        
        const User = require('../model/User');
        const user = await User.findById(userId);
        
        let searchQuery = {
            verified: true,
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { targetMuscles: { $regex: query, $options: 'i' } },
                { category: { $regex: query, $options: 'i' } },
                { movementPattern: { $regex: query, $options: 'i' } },
                { primaryMuscle: { $regex: query, $options: 'i' } }
            ]
        };
        
        // Filter by user's workout type if set
        if (user && user.workout_type) {
            searchQuery.category = user.workout_type;
        }
        
        const exercises = await Exercise.find(searchQuery).limit(20);
        
        // Get user's ratings
        const userRatings = await UserExerciseRating.find({ 
            userId: userId,
            exerciseId: { $in: exercises.map(ex => ex._id) }
        });
        
        const ratingsMap = {};
        userRatings.forEach(rating => {
            ratingsMap[rating.exerciseId.toString()] = rating.rating;
        });
        
        const exercisesWithRatings = exercises.map(exercise => ({
            ...exercise.toObject(),
            userRating: ratingsMap[exercise._id.toString()] || null
        }));
        
        res.json({ success: true, exercises: exercisesWithRatings });
    } catch (error) {
        console.error('Error searching exercises:', error);
        res.status(500).json({ success: false, message: 'Error searching exercises' });
    }
});
// Add this route to userRoutes.js
router.put('/user/profile/update', isAuthenticated, userController.updateUserProfile);


// brimstone
// Mark food as consumed
// In your userRoutes.js, improve the mark-consumed endpoint:
router.post('/api/nutrition/mark-consumed', userController.checkMembershipActive, isAuthenticated, async (req, res) => {
    try {
        const { foodName, calories, protein, carbs, fats, day } = req.body;
        const userId = req.session.user.id;
        
        //  console.log('🎯 Marking food as consumed:', { foodName, day, userId });
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // ✅ PERMANENT FIX: Use local time for week calculation
        const weekStart = new Date(today);
        const dayOfWeek = today.getDay();
        weekStart.setDate(today.getDate() - dayOfWeek);
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        //  console.log('📅 Local Week range:', weekStart.toString(), 'to', weekEnd.toString());

        // Find the WEEKLY nutrition entry
        let nutritionEntry = await NutritionHistory.findOne({
            userId: userId,
            date: { $gte: weekStart, $lt: weekEnd }
        });
        
        //  console.log('🔍 Weekly nutrition found:', !!nutritionEntry);
        
        if (!nutritionEntry) {
            //  console.log('❌ No weekly nutrition plan found for this week');
            return res.status(404).json({
                success: false,
                message: 'No nutrition plan found for this week'
            });
        }

        const targetDay = day || ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()];
        
        //  console.log('🎯 Target day:', targetDay);
        //  console.log('📋 Available days:', Object.keys(nutritionEntry.daily_nutrition || {}));

        // Get the day data
        const dayData = nutritionEntry.daily_nutrition[targetDay];
        if (!dayData) {
            //  console.log('❌ Day not found in weekly nutrition:', targetDay);
            return res.status(400).json({
                success: false,
                message: 'Day not found in nutrition plan: ' + targetDay
            });
        }

        //  console.log('🍽️ Foods before update:', dayData.foods.length);
        
        // Find and update the food
        const foodIndex = dayData.foods.findIndex(food => 
            food.name === foodName && food.consumed === false
        );

        if (foodIndex === -1) {
            //  console.log('❌ Food not found or already consumed:', foodName);
            return res.status(404).json({
                success: false,
                message: 'Food not found or already consumed: ' + foodName
            });
        }

        // Update the food
        dayData.foods[foodIndex].consumed = true;
        dayData.foods[foodIndex].consumedAt = new Date();

        // Update daily totals by adding the food's nutrients
        dayData.calories_consumed = (dayData.calories_consumed || 0) + parseInt(calories);
        dayData.protein_consumed = (dayData.protein_consumed || 0) + parseInt(protein);
        
        // Update macros
        dayData.macros.protein = (dayData.macros.protein || 0) + parseInt(protein);
        dayData.macros.carbs = (dayData.macros.carbs || 0) + parseInt(carbs);
        dayData.macros.fats = (dayData.macros.fats || 0) + parseInt(fats);

        //  console.log('✅ After update - calories_consumed:', dayData.calories_consumed);
        //  console.log('✅ After update - protein_consumed:', dayData.protein_consumed);
        //  console.log('✅ Food marked as consumed:', foodName);

        // Mark the document as modified to ensure Mongoose saves the nested changes
        nutritionEntry.markModified('daily_nutrition');
        
        await nutritionEntry.save();
        
        //  console.log('💾 Saved to database successfully');

        res.json({
            success: true,
            message: 'Food marked as consumed successfully',
            updatedNutrition: {
                calories_consumed: dayData.calories_consumed,
                protein_consumed: dayData.protein_consumed,
                calorie_goal: nutritionEntry.calorie_goal,
                protein_goal: nutritionEntry.protein_goal
            }
        });
        
    } catch (error) {
        console.error('❌ Error marking food as consumed:', error);
        res.status(500).json({
            success: false,
            message: 'Error marking food as consumed: ' + error.message
        });
    }
});


module.exports = router;
