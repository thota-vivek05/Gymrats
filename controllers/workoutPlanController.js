// const WorkoutPlan = require('../model/WorkoutPlan');

// // Get trainer dashboard
// exports.getTrainerDashboard = async (req, res) => {
//     try {
//         // Get all clients for this trainer
//         // This is a placeholder - replace with your actual user relationship logic
//         const clients = await User.find({ role: 'client' }).select('name email goal').lean();
        
//         res.render('trainer', { clients });
//     } catch (error) {
//         console.error('Error loading trainer dashboard:', error);
//         res.status(500).json({ message: 'Server error' });
//     }
// };

// // Get workout plan edit page
// exports.getWorkoutPlanEdit = async (req, res) => {
//     try {
//         const clientId = req.params.clientId;
        
//         // Get client details
//         const client = await User.findById(clientId).lean();
        
//         if (!client) {
//             return res.status(404).send('Client not found');
//         }
        
//         // Get existing workout plan or create empty template
//         let workoutPlan = {};
//         const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
//         // Check if user has an existing workout plan
//         const existingPlan = await WorkoutPlan.findOne({ 
//             user: clientId,
//             type: 'custom'  // Assuming custom workout plans for specific users
//         }).lean();
        
//         if (existingPlan) {
//             workoutPlan = existingPlan.exercises;
//             notes = existingPlan.description;
//         } else {
//             // Create an empty workout plan structure
//             workoutPlan = {};
//             notes = '';
            
//             // Initialize empty days
//             days.forEach(day => {
//                 workoutPlan[day] = [];
//             });
//         }
        
//         res.render('workoutplanedit', { 
//             id: clientId,
//             name: client.name,
//             goal: client.goal || 'Strength Training',
//             workoutPlan,
//             notes
//         });
//     } catch (error) {
//         console.error('Error loading workout plan edit page:', error);
//         res.status(500).json({ message: 'Server error' });
//     }
// };

// // Save workout plan
// exports.saveWorkoutPlan = async (req, res) => {
//     try {
//         const { clientId, currentWeek, nextWeek, notes } = req.body;
        
//         // Validate request
//         if (!clientId) {
//             return res.status(400).json({ success: false, message: 'Client ID is required' });
//         }
        
//         // Get client details
//         const client = await User.findById(clientId);
        
//         if (!client) {
//             return res.status(404).json({ success: false, message: 'Client not found' });
//         }
        
//         // Find existing plan or create new one
//         let workoutPlan = await WorkoutPlan.findOne({ 
//             user: clientId,
//             type: 'custom'
//         });
        
//         if (!workoutPlan) {
//             // Create new workout plan
//             workoutPlan = new WorkoutPlan({
//                 name: `${client.name}'s Workout Plan`,
//                 type: 'Strength', // Default type, modify as needed
//                 difficulty: 'Intermediate', // Default difficulty, modify as needed
//                 duration: '4 weeks', // Default duration, modify as needed
//                 description: notes,
//                 exercises: currentWeek, // Store current week as primary exercises
//                 nextWeekExercises: nextWeek, // Add a custom field for next week
//                 user: clientId,
//                 verified: true // Trainer-created plans are verified by default
//             });
//         } else {
//             // Update existing plan
//             workoutPlan.exercises = currentWeek;
//             workoutPlan.nextWeekExercises = nextWeek;
//             workoutPlan.description = notes;
//             workoutPlan.updatedAt = Date.now();
//         }
        
//         // Save workout plan
//         await workoutPlan.save();
        
//         // Return success response
//         res.status(200).json({
//             success: true,
//             message: 'Workout plan saved successfully'
//         });
//     } catch (error) {
//         console.error('Error saving workout plan:', error);
//         res.status(500).json({ success: false, message: 'Server error' });
//     }
// };

// // Get all workout plans (admin feature)
// exports.getAllWorkoutPlans = async (req, res) => {
//     try {
//         const workoutPlans = await WorkoutPlan.find()
//             .populate('user', 'name email')
//             .lean();
        
//         res.status(200).json(workoutPlans);
//     } catch (error) {
//         console.error('Error fetching workout plans:', error);
//         res.status(500).json({ message: 'Server error' });
//     }
// };

// // Get workout plan by ID
// exports.getWorkoutPlanById = async (req, res) => {
//     try {
//         const planId = req.params.planId;
        
//         const workoutPlan = await WorkoutPlan.findById(planId)
//             .populate('user', 'name email')
//             .lean();
        
//         if (!workoutPlan) {
//             return res.status(404).json({ message: 'Workout plan not found' });
//         }
        
//         res.status(200).json(workoutPlan);
//     } catch (error) {
//         console.error('Error fetching workout plan:', error);
//         res.status(500).json({ message: 'Server error' });
//     }
// };

// // Delete workout plan
// exports.deleteWorkoutPlan = async (req, res) => {
//     try {
//         const planId = req.params.planId;
        
//         const workoutPlan = await WorkoutPlan.findById(planId);
        
//         if (!workoutPlan) {
//             return res.status(404).json({ success: false, message: 'Workout plan not found' });
//         }
        
//         await workoutPlan.remove();
        
//         res.status(200).json({
//             success: true,
//             message: 'Workout plan deleted successfully'
//         });
//     } catch (error) {
//         console.error('Error deleting workout plan:', error);
//         res.status(500).json({ success: false, message: 'Server error' });
//     }
// };