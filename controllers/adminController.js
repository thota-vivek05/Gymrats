// Import models
const User = require('../model/User');
const Trainer = require('../model/Trainer');
const Exercise = require('../model/Exercise');
const Membership = require('../model/Membership');
const NutritionPlan = require('../model/NutritionPlan');
const WorkoutPlan = require('../model/WorkoutPlan');
const Verifier = require('../model/Verifier');

const adminController = {
  // Dashboard
  getDashboard: async (req, res) => {
    try {
      // Authentication check
      if (!req.session.userId) {
        return res.redirect('/login_signup');
      }

      // Get counts from database
      const userCount = await User.countDocuments();
      const activeMembers = await User.countDocuments({ status: 'Active' });
      const trainerCount = await Trainer.countDocuments();
      const verifierCount = await Verifier.countDocuments();
      
      res.render('admin_dashboard', {
        pageTitle: 'Admin Dashboard',
        user: req.session.user || null,
        stats: {
          totalUsers: userCount,
          activeMembers,
          personalTrainers: trainerCount,
          contentVerifiers: verifierCount
        }
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.render('admin_dashboard', {
        pageTitle: 'Admin Dashboard',
        user: req.session.user || null
      });
    }
  },

  // User Management
  getUsers: async (req, res) => {
    try {
      // Authentication check
      if (!req.session.userId) {
        return res.redirect('/login_signup');
      }

      const users = await User.find().sort({ created_at: -1 });
      const userCount = await User.countDocuments();
      const activeMembers = await User.countDocuments({ status: 'Active' });
      const platinumUsers = await User.countDocuments({ membershipType: 'Platinum' });
      const newSignups = await User.countDocuments({ 
        created_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });
      
      res.render('admin_user', {
        pageTitle: 'User Management',
        user: req.session.user || null,
        users,
        stats: {
          totalUsers: userCount,
          activeMembers,
          platinumUsers,
          newSignups
        }
      });
    } catch (error) {
      console.error('User management error:', error);
      res.render('admin_user', {
        pageTitle: 'User Management',
        user: req.session.user || null,
        users: []
      });
    }
  },

  // Create User
  createUser: async (req, res) => {
    try {
      // Authentication check
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { fullName, email, password, dob, gender, phone, status, membershipType } = req.body;

      // Validate required fields
      if (!fullName || !email || !password) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      // Check if email already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }

      // Hash password
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user
      const newUser = new User({
        full_name: fullName,
        email,
        password_hash: hashedPassword,
        dob,
        gender,
        phone,
        status: status || 'Active',
        membershipType: membershipType || 'Basic',
        created_at: new Date()
      });

      await newUser.save();
      res.status(201).json({ success: true, message: 'User created successfully', user: newUser });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  // Update User
  updateUser: async (req, res) => {
    try {
      // Authentication check
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const userId = req.params.id;
      const { fullName, email, dob, gender, phone, status, membershipType } = req.body;

      // Find and update user
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          full_name: fullName,
          email,
          dob,
          gender,
          phone,
          status,
          membershipType,
          updated_at: new Date()
        },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.status(200).json({ success: true, message: 'User updated successfully', user: updatedUser });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  // Delete User
  deleteUser: async (req, res) => {
    try {
      // Authentication check
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const userId = req.params.id;

      // Find and delete user
      const deletedUser = await User.findByIdAndDelete(userId);

      if (!deletedUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Also delete related memberships
      await Membership.deleteMany({ user_id: userId });

      res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  // Trainer Management
  getTrainers: async (req, res) => {
    try {
      // Authentication check
      if (!req.session.userId) {
        return res.redirect('/login_signup');
      }

      const trainers = await Trainer.find().sort({ createdAt: -1 });
      const trainerCount = await Trainer.countDocuments();
      const pendingApprovals = await Trainer.countDocuments({ status: 'Pending' });
      
      res.render('admin_trainers', {
        pageTitle: 'Trainer Management',
        user: req.session.user || null,
        trainers,
        stats: {
          totalTrainers: trainerCount,
          revenueGenerated: 245750, // This would come from transactions in a real implementation
          activeSessions: 842, // This would be calculated from active sessions
          pendingApprovals
        }
      });
    } catch (error) {
      console.error('Trainer management error:', error);
      res.render('admin_trainers', {
        pageTitle: 'Trainer Management',
        user: req.session.user || null,
        trainers: []
      });
    }
  },

  // Create Trainer
  createTrainer: async (req, res) => {
    try {
      // Authentication check
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { name, email, specialization, experience, certifications, bio, status } = req.body;

      // Validate required fields
      if (!name || !email || !specialization) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      // Check if email already exists
      const existingTrainer = await Trainer.findOne({ email });
      if (existingTrainer) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }

      // Create new trainer
      const newTrainer = new Trainer({
        name,
        email,
        specialization,
        experience,
        certifications,
        bio,
        status: status || 'Pending',
        createdAt: new Date()
      });

      await newTrainer.save();
      res.status(201).json({ success: true, message: 'Trainer created successfully', trainer: newTrainer });
    } catch (error) {
      console.error('Create trainer error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  // Update Trainer
  updateTrainer: async (req, res) => {
    try {
      // Authentication check
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const trainerId = req.params.id;
      const { name, email, specialization, experience, certifications, bio, status } = req.body;

      // Find and update trainer
      const updatedTrainer = await Trainer.findByIdAndUpdate(
        trainerId,
        {
          name,
          email,
          specialization,
          experience,
          certifications,
          bio,
          status,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!updatedTrainer) {
        return res.status(404).json({ success: false, message: 'Trainer not found' });
      }

      res.status(200).json({ success: true, message: 'Trainer updated successfully', trainer: updatedTrainer });
    } catch (error) {
      console.error('Update trainer error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  // Delete Trainer
  deleteTrainer: async (req, res) => {
    try {
      // Authentication check
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const trainerId = req.params.id;

      // Find and delete trainer
      const deletedTrainer = await Trainer.findByIdAndDelete(trainerId);

      if (!deletedTrainer) {
        return res.status(404).json({ success: false, message: 'Trainer not found' });
      }

      res.status(200).json({ success: true, message: 'Trainer deleted successfully' });
    } catch (error) {
      console.error('Delete trainer error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  // Membership Management
  getMemberships: async (req, res) => {
    try {
      // Authentication check
      if (!req.session.userId) {
        return res.redirect('/login_signup');
      }

      const memberships = await Membership.find().sort({ price: 1 });
      const totalRevenue = 892845; // This would come from transactions in a real implementation
      const activeMembers = await User.countDocuments({ status: 'Active' });
      const premiumMembers = await User.countDocuments({ membershipType: 'Platinum' });
      const newSignups = await User.countDocuments({ 
        created_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });
      
      res.render('admin_membership', {
        pageTitle: 'Membership Management',
        user: req.session.user || null,
        memberships,
        stats: {
          totalRevenue,
          activeMembers,
          premiumMembers,
          newSignups
        }
      });
    } catch (error) {
      console.error('Membership management error:', error);
      res.render('admin_membership', {
        pageTitle: 'Membership Management',
        user: req.session.user || null,
        memberships: []
      });
    }
  },

  // Create Membership
  createMembership: async (req, res) => {
    try {
      // Authentication check
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { user_id, plan, duration, price, payment_method, card_type, card_last_four } = req.body;

      // Validate required fields
      if (!user_id || !plan || !duration || !price) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      // Check if user exists
      const userExists = await User.findById(user_id);
      if (!userExists) {
        return res.status(400).json({ success: false, message: 'User not found' });
      }

      // Calculate start and end dates
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + parseInt(duration));

      // Create new membership
      const newMembership = new Membership({
        user_id,
        plan,
        duration: parseInt(duration),
        start_date: startDate,
        end_date: endDate,
        price: parseFloat(price),
        payment_method,
        card_type,
        card_last_four
      });

      await newMembership.save();
      
      // Update user's membership type
      await User.findByIdAndUpdate(user_id, { membershipType: plan, status: 'Active' });

      res.status(201).json({ success: true, message: 'Membership created successfully', membership: newMembership });
    } catch (error) {
      console.error('Create membership error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  // Update Membership
  updateMembership: async (req, res) => {
    try {
      // Authentication check
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const membershipId = req.params.id;
      const { plan, duration, price, payment_method, card_type, card_last_four } = req.body;

      // Find current membership
      const currentMembership = await Membership.findById(membershipId);
      if (!currentMembership) {
        return res.status(404).json({ success: false, message: 'Membership not found' });
      }

      // Calculate new end date if duration changed
      let endDate = currentMembership.end_date;
      if (duration && duration !== currentMembership.duration) {
        const startDate = currentMembership.start_date;
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + parseInt(duration));
      }

      // Find and update membership
      const updatedMembership = await Membership.findByIdAndUpdate(
        membershipId,
        {
          plan,
          duration: duration ? parseInt(duration) : currentMembership.duration,
          end_date: endDate,
          price: price ? parseFloat(price) : currentMembership.price,
          payment_method,
          card_type,
          card_last_four
        },
        { new: true }
      );

      // If plan changed, update user's membership type
      if (plan && plan !== currentMembership.plan) {
        await User.findByIdAndUpdate(currentMembership.user_id, { membershipType: plan });
      }

      res.status(200).json({ success: true, message: 'Membership updated successfully', membership: updatedMembership });
    } catch (error) {
      console.error('Update membership error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  // Delete Membership
  deleteMembership: async (req, res) => {
    try {
      // Authentication check
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const membershipId = req.params.id;

      // Find and delete membership
      const deletedMembership = await Membership.findByIdAndDelete(membershipId);

      if (!deletedMembership) {
        return res.status(404).json({ success: false, message: 'Membership not found' });
      }

      // Update user status
      await User.findByIdAndUpdate(deletedMembership.user_id, { 
        status: 'Inactive',
        membershipType: 'None'
      });

      res.status(200).json({ success: true, message: 'Membership deleted successfully' });
    } catch (error) {
      console.error('Delete membership error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  // Nutrition Plans Management
  getNutritionPlans: async (req, res) => {
    try {
      // Authentication check
      if (!req.session.userId) {
        return res.redirect('/login_signup');
      }

      const nutritionPlans = await NutritionPlan.find().sort({ userCount: -1 });
      const totalPlans = await NutritionPlan.countDocuments();
      const verifiedPlans = await NutritionPlan.countDocuments({ verified: true });
      const mostPopular = await NutritionPlan.findOne().sort({ userCount: -1 });
      const activeSubscribers = nutritionPlans.reduce((total, plan) => total + plan.userCount, 0);
      
      res.render('admin_nutrition', {
        pageTitle: 'Nutrition Plans Management',
        user: req.session.user || null,
        nutritionPlans,
        stats: {
          totalPlans,
          mostPopular: mostPopular ? mostPopular.name : 'None',
          mostPopularCount: mostPopular ? mostPopular.userCount : 0,
          verifiedPlans,
          verifiedPercent: Math.round((verifiedPlans / totalPlans) * 100),
          activeSubscribers
        }
      });
    } catch (error) {
      console.error('Nutrition plans management error:', error);
      res.render('admin_nutrition', {
        pageTitle: 'Nutrition Plans Management',
        user: req.session.user || null,
        nutritionPlans: []
      });
    }
  },

  // Create Nutrition Plan
  createNutritionPlan: async (req, res) => {
    try {
      // Authentication check
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { name, description, calorie_target, protein_target, carb_target, fat_target, creator_id, verified } = req.body;

      // Validate required fields
      if (!name || !description || !calorie_target) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      // Create new nutrition plan
      const newPlan = new NutritionPlan({
        name,
        description,
        calorie_target: parseInt(calorie_target),
        protein_target: parseInt(protein_target),
        carb_target: parseInt(carb_target),
        fat_target: parseInt(fat_target),
        creator_id,
        verified: verified || false,
        userCount: 0,
        createdAt: new Date()
      });

      await newPlan.save();
      res.status(201).json({ success: true, message: 'Nutrition plan created successfully', plan: newPlan });
    } catch (error) {
      console.error('Create nutrition plan error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  // Update Nutrition Plan
  updateNutritionPlan: async (req, res) => {
    try {
      // Authentication check
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const planId = req.params.id;
      const { name, description, calorie_target, protein_target, carb_target, fat_target, verified } = req.body;

      // Find and update nutrition plan
      const updatedPlan = await NutritionPlan.findByIdAndUpdate(
        planId,
        {
          name,
          description,
          calorie_target: calorie_target ? parseInt(calorie_target) : undefined,
          protein_target: protein_target ? parseInt(protein_target) : undefined,
          carb_target: carb_target ? parseInt(carb_target) : undefined,
          fat_target: fat_target ? parseInt(fat_target) : undefined,
          verified,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!updatedPlan) {
        return res.status(404).json({ success: false, message: 'Nutrition plan not found' });
      }

      res.status(200).json({ success: true, message: 'Nutrition plan updated successfully', plan: updatedPlan });
    } catch (error) {
      console.error('Update nutrition plan error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  // Delete Nutrition Plan
  deleteNutritionPlan: async (req, res) => {
    try {
      // Authentication check
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const planId = req.params.id;

      // Find and delete nutrition plan
      const deletedPlan = await NutritionPlan.findByIdAndDelete(planId);

      if (!deletedPlan) {
        return res.status(404).json({ success: false, message: 'Nutrition plan not found' });
      }

      res.status(200).json({ success: true, message: 'Nutrition plan deleted successfully' });
    } catch (error) {
      console.error('Delete nutrition plan error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  // Exercises Management
  getExercises: async (req, res) => {
    try {
      // Authentication check
      if (!req.session.userId) {
        return res.redirect('/login_signup');
      }

      const exercises = await Exercise.find().sort({ usageCount: -1 });
      const totalExercises = await Exercise.countDocuments();
      const verifiedExercises = await Exercise.countDocuments({ verified: true });
      const mostPopular = await Exercise.findOne().sort({ usageCount: -1 });
      
      res.render('admin_exercises', {
        pageTitle: 'Exercises Management',
        user: req.session.user || null,
        exercises,
        stats: {
          totalExercises,
          mostPopular: mostPopular ? mostPopular.name : 'None',
          mostPopularCount: mostPopular ? mostPopular.usageCount : 0,
          verifiedExercises,
          verifiedPercent: Math.round((verifiedExercises / totalExercises) * 100),
          trendingExercise: 'Kettlebell Swings' // This would be determined by recent usage statistics
        }
      });
    } catch (error) {
      console.error('Exercises management error:', error);
      res.render('admin_exercises', {
        pageTitle: 'Exercises Management',
        user: req.session.user || null,
        exercises: []
      });
    }
  },

  // Create Exercise
  createExercise: async (req, res) => {
    try {
      // Authentication check
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { name, description, category, muscle_groups, difficulty, equipment, verified, creator_id } = req.body;

      // Validate required fields
      if (!name || !description || !category || !muscle_groups) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      // Create new exercise
      const newExercise = new Exercise({
        name,
        description,
        category,
        muscle_groups: Array.isArray(muscle_groups) ? muscle_groups : [muscle_groups],
        difficulty,
        equipment,
        verified: verified || false,
        creator_id,
        usageCount: 0,
        createdAt: new Date()
      });

      await newExercise.save();
      res.status(201).json({ success: true, message: 'Exercise created successfully', exercise: newExercise });
    } catch (error) {
      console.error('Create exercise error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  // Update Exercise
  updateExercise: async (req, res) => {
    try {
      // Authentication check
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const exerciseId = req.params.id;
      const { name, description, category, muscle_groups, difficulty, equipment, verified } = req.body;

      // Find and update exercise
      const updatedExercise = await Exercise.findByIdAndUpdate(
        exerciseId,
        {
          name,
          description,
          category,
          muscle_groups: muscle_groups ? (Array.isArray(muscle_groups) ? muscle_groups : [muscle_groups]) : undefined,
          difficulty,
          equipment,
          verified,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!updatedExercise) {
        return res.status(404).json({ success: false, message: 'Exercise not found' });
      }

      res.status(200).json({ success: true, message: 'Exercise updated successfully', exercise: updatedExercise });
    } catch (error) {
      console.error('Update exercise error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  // Delete Exercise
  deleteExercise: async (req, res) => {
    try {
      // Authentication check
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const exerciseId = req.params.id;

      // Find and delete exercise
      const deletedExercise = await Exercise.findByIdAndDelete(exerciseId);

      if (!deletedExercise) {
        return res.status(404).json({ success: false, message: 'Exercise not found' });
      }

      res.status(200).json({ success: true, message: 'Exercise deleted successfully' });
    } catch (error) {
      console.error('Delete exercise error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  // Workout Plans Management
  getWorkoutPlans: async (req, res) => {
    try {
      // Authentication check
      if (!req.session.userId) {
        return res.redirect('/login_signup');
      }

      const workoutPlans = await WorkoutPlan.find().sort({ userCount: -1 });
      const totalPlans = await WorkoutPlan.countDocuments();
      const verifiedPlans = await WorkoutPlan.countDocuments({ verified: true });
      const pendingReview = await WorkoutPlan.countDocuments({ verified: false });
      const activeUsers = workoutPlans.reduce((total, plan) => total + plan.userCount, 0);
      
      res.render('admin_workouts', {
        pageTitle: 'Workout Plans Management',
        user: req.session.user || null,
        workoutPlans,
        stats: {
          totalPlans,
          activeUsers,
          verifiedPlans,
          verifiedPercent: Math.round((verifiedPlans / totalPlans) * 100),
          pendingReview
        }
      });
    } catch (error) {
      console.error('Workout plans management error:', error);
      res.render('admin_workouts', {
        pageTitle: 'Workout Plans Management',
        user: req.session.user || null,
        workoutPlans: []
      });
    }
  },

  // Create Workout Plan
  createWorkoutPlan: async (req, res) => {
    try {
      // Authentication check
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { name, description, level, goal, duration, exercises, creator_id, verified } = req.body;

      // Validate required fields
      if (!name || !description || !level || !goal || !duration) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      // Create new workout plan
      const newPlan = new WorkoutPlan({
        name,
        description,
        level,
        goal,
        duration: parseInt(duration),
        exercises: exercises || [],
        creator_id,
        verified: verified || false,
        userCount: 0,
        createdAt: new Date()
      });

      await newPlan.save();
      res.status(201).json({ success: true, message: 'Workout plan created successfully', plan: newPlan });
    } catch (error) {
      console.error('Create workout plan error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

// Update Workout Plan
  updateWorkoutPlan: async (req, res) => {
    try {
      // Authentication check
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const planId = req.params.id;
      const { name, description, level, goal, duration, exercises, verified } = req.body;

      // Find and update workout plan
      const updatedPlan = await WorkoutPlan.findByIdAndUpdate(
        planId,
        {
          name,
          description,
          level,
          goal,
          duration: duration ? parseInt(duration) : undefined,
          exercises: exercises || undefined,
          verified,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!updatedPlan) {
        return res.status(404).json({ success: false, message: 'Workout plan not found' });
      }

      res.status(200).json({ success: true, message: 'Workout plan updated successfully', plan: updatedPlan });
    } catch (error) {
      console.error('Update workout plan error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

// Delete Workout Plan
  deleteWorkoutPlan: async (req, res) => {
    try {
      // Authentication check
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const planId = req.params.id;

      // Find and delete workout plan
      const deletedPlan = await WorkoutPlan.findByIdAndDelete(planId);

      if (!deletedPlan) {
        return res.status(404).json({ success: false, message: 'Workout plan not found' });
      }

      res.status(200).json({ success: true, message: 'Workout plan deleted successfully' });
    } catch (error) {
      console.error('Delete workout plan error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },


  // Verifiers Management
getVerifiers: async (req, res) => {
  try {
    // Authentication check
    if (!req.session.userId) {
      return res.redirect('/login_signup');
    }

    const verifiers = await Verifier.find().sort({ contentReviewed: -1 });
    const verifierCount = await Verifier.countDocuments();
    const pendingVerifiers = await Verifier.countDocuments({ status: 'Pending' });
    const activeVerifiers = await Verifier.countDocuments({ status: 'Active' });
    const contentReviewedTotal = verifiers.reduce((total, verifier) => total + verifier.contentReviewed, 0);
    
    res.render('admin_verifiers', {
      pageTitle: 'Content Verifiers',
      user: req.session.user || null,
      verifiers,
      stats: {
        totalVerifiers: verifierCount,
        pendingVerifiers,
        activeVerifiers,
        contentReviewedTotal
      }
    });
  } catch (error) {
    console.error('Verifier management error:', error);
    res.render('admin_verifiers', {
      pageTitle: 'Content Verifiers',
      user: req.session.user || null,
      verifiers: []
    });
  }
},

getSettings: async (req, res) => {
  try {
    // Authentication check
    if (!req.session.userId) {
      return res.redirect('/login_signup');
    }
    
    // In a real application, these would be fetched from a database or config file
    // For demonstration, we'll use hardcoded settings
    const settings = {
      siteName: 'GymRats Fitness',
      maintenanceMode: false,
      emailNotifications: true,
      allowUserRegistration: true,
      membershipPlans: [
        { name: 'Basic', price: 9.99 },
        { name: 'Silver', price: 19.99 },
        { name: 'Gold', price: 29.99 },
        { name: 'Platinum', price: 49.99 }
      ],
      paymentGateways: ['Stripe', 'PayPal', 'Credit Card'],
      systemEmail: 'admin@gymrats.com'
    };
    
    res.render('admin_settings', {
      pageTitle: 'System Settings',
      user: req.session.user || null,
      settings
    });
  } catch (error) {
    console.error('Settings error:', error);
    res.render('admin_settings', {
      pageTitle: 'System Settings',
      user: req.session.user || null,
      settings: {}
    });
  }
},

  // Create Verifier
  createVerifier: async (req, res) => {
    try {
      // Authentication check
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { name, email, expertise, status } = req.body;

      // Validate required fields
      if (!name || !email || !expertise) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      // Check if email already exists
      const existingVerifier = await Verifier.findOne({ email });
      if (existingVerifier) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }

      // Create new verifier
      const newVerifier = new Verifier({
        name,
        email,
        expertise,
        status: status || 'Pending',
        contentReviewed: 0,
        createdAt: new Date()
      });

      await newVerifier.save();
      res.status(201).json({ success: true, message: 'Verifier created successfully', verifier: newVerifier });
    } catch (error) {
      console.error('Create verifier error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  // Update Verifier
  updateVerifier: async (req, res) => {
    try {
      // Authentication check
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const verifierId = req.params.id;
      const { name, email, expertise, status, contentReviewed } = req.body;

      // Find and update verifier
      const updatedVerifier = await Verifier.findByIdAndUpdate(
        verifierId,
        {
          name,
          email,
          expertise,
          status,
          contentReviewed: contentReviewed ? parseInt(contentReviewed) : undefined,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!updatedVerifier) {
        return res.status(404).json({ success: false, message: 'Verifier not found' });
      }

      res.status(200).json({ success: true, message: 'Verifier updated successfully', verifier: updatedVerifier });
    } catch (error) {
      console.error('Update verifier error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  // Delete Verifier
  deleteVerifier: async (req, res) => {
    try {
      // Authentication check
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const verifierId = req.params.id;

      // Find and delete verifier
      const deletedVerifier = await Verifier.findByIdAndDelete(verifierId);

      if (!deletedVerifier) {
        return res.status(404).json({ success: false, message: 'Verifier not found' });
      }

      res.status(200).json({ success: true, message: 'Verifier deleted successfully' });
    } catch (error) {
      console.error('Delete verifier error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  // Update Settings (example implementation)
  updateSettings: async (req, res) => {
    try {
      // Authentication check
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // Example settings update logic (adjust based on actual requirements)
      const { siteName, maintenanceMode, emailNotifications } = req.body;

      // In a real implementation, this would update a settings collection or configuration file
      // For demonstration, we'll just return success
      res.status(200).json({
        success: true,
        message: 'Settings updated successfully',
        settings: { siteName, maintenanceMode, emailNotifications }
      });
    } catch (error) {
      console.error('Update settings error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
};

module.exports = adminController;