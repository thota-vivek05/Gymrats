// Import models
const User = require('../model/User');
const Trainer = require('../model/Trainer');
const Exercise = require('../model/Exercise');
const Membership = require('../model/Membership');
const WorkoutPlan = require('../model/WorkoutPlan');
const Verifier = require('../model/Verifier');
const TrainerApplication = require('../model/TrainerApplication');
const WorkoutHistory = require('../model/WorkoutHistory');
const NutritionHistory = require('../model/NutritionHistory');
const bcrypt = require('bcryptjs');

const adminController = {
  // Dashboard
  getDashboard: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.redirect('/admin_login');
      }
      const userCount = await User.countDocuments();
      const activeMembers = await User.countDocuments({ status: 'Active' });
      const trainerCount = await Trainer.countDocuments();
      const verifierCount = await Verifier.countDocuments();
      const users = await User.find().sort({ created_at: -1 }).limit(5).select('full_name email status membershipType created_at');
      const trainers = await Trainer.find().sort({ createdAt: -1 }).limit(5).select('name specializations experience status email');
      const verifiers = await Verifier.find().sort({ createdAt: -1 }).limit(5).select('name');
      res.render('admin_dashboard', {
        pageTitle: 'Admin Dashboard',
        user: req.session.user || null,
        stats: {
          totalUsers: userCount,
          activeMembers,
          personalTrainers: trainerCount,
          contentVerifiers: verifierCount
        },
        users: users || [],
        trainers: trainers || [],
        verifiers: verifiers || []
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.render('admin_dashboard', {
        pageTitle: 'Admin Dashboard',
        user: req.session.user || null,
        users: [],
        trainers: [],
        verifiers: []
      });
    }
  },

  // User Management
  getUsers: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.redirect('/admin_login');
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

  createUser: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const { fullName, email, password, dob, gender, phone, status, membershipType, weight, height } = req.body;
      if (!fullName || !email || !password || !dob || !gender || !phone || !weight || !height) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const heightInMeters = Number(height) / 100;
      const bmi = heightInMeters > 0 ? (Number(weight) / (heightInMeters * heightInMeters)).toFixed(2) : null;
      const newUser = new User({
        full_name: fullName,
        email,
        password_hash: hashedPassword,
        dob: new Date(dob),
        gender,
        phone,
        weight: Number(weight),
        height: Number(height),
        BMI: bmi ? Number(bmi) : null,
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

  updateUser: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const userId = req.params.id;
      const { fullName, email, dob, gender, phone, weight, height, status, membershipType } = req.body;
      let bmi = null;
      if (weight && height) {
        const heightInMeters = Number(height) / 100;
        bmi = heightInMeters > 0 ? (Number(weight) / (heightInMeters * heightInMeters)).toFixed(2) : null;
      }
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          full_name: fullName,
          email,
          dob: dob ? new Date(dob) : undefined,
          gender,
          phone,
          weight: weight ? Number(weight) : undefined,
          height: height ? Number(height) : undefined,
          BMI: bmi ? Number(bmi) : undefined,
          status,
          membershipType
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

  deleteUser: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const userId = req.params.id;
      const deletedUser = await User.findByIdAndDelete(userId);
      if (!deletedUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      await WorkoutHistory.deleteMany({ userId });
      await NutritionHistory.deleteMany({ userId });
      res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  // Trainer Management
  getTrainers: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.redirect('/admin_login');
      }
      const trainers = await Trainer.find().sort({ createdAt: -1 });
      const trainerCount = await Trainer.countDocuments();
      const pendingApprovals = await TrainerApplication.countDocuments({ status: 'Pending' });
      res.render('admin_trainers', {
        pageTitle: 'Trainer Management',
        user: req.session.user || null,
        trainers,
        stats: {
          totalTrainers: trainerCount,
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

  // New API endpoint to fetch trainers dynamically
  getTrainersApi: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const { search } = req.query; // Allow search query parameter
      let query = {};
      if (search) {
        query = {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { specializations: { $regex: search, $options: 'i' } }
          ]
        };
      }
      const trainers = await Trainer.find(query).sort({ createdAt: -1 }).select('name email specializations experience status');
      res.status(200).json({ success: true, trainers });
    } catch (error) {
      console.error('Get trainers API error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  createTrainer: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const { name, email, password, phone, experience, specializations } = req.body;
      if (!name || !email || !password || !phone || !experience) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }
      const existingTrainer = await Trainer.findOne({ email });
      if (existingTrainer) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const newTrainer = new Trainer({
        name,
        email,
        password_hash: hashedPassword,
        phone,
        experience,
        specializations: specializations || [],
        status: 'Active',
        createdAt: new Date()
      });
      await newTrainer.save();
      res.status(201).json({ success: true, message: 'Trainer created successfully', trainer: newTrainer });
    } catch (error) {
      console.error('Create trainer error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  updateTrainer: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const trainerId = req.params.id;
      const { name, email, phone, experience, specializations, status } = req.body;
      const updatedTrainer = await Trainer.findByIdAndUpdate(
        trainerId,
        {
          name,
          email,
          phone,
          experience,
          specializations,
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

  deleteTrainer: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const trainerId = req.params.id;
      const deletedTrainer = await Trainer.findByIdAndDelete(trainerId);
      if (!deletedTrainer) {
        return res.status(404).json({ success: false, message: 'Trainer not found' });
      }
      await User.updateMany(
        { trainer: trainerId },
        { $set: { trainer: null } }
      );
      res.status(200).json({ success: true, message: 'Trainer deleted successfully' });
    } catch (error) {
      console.error('Delete trainer error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  getVerifiers: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.redirect('/admin_login');
      }
      const verifiers = await Verifier.find().sort({ createdAt: -1 });
      const verifierCount = await Verifier.countDocuments();
      res.render('admin_verifier', {
        pageTitle: 'Verifier Management',
        user: req.session.user || null,
        verifiers,
        stats: {
          totalVerifiers: verifierCount
        }
      });
    } catch (error) {
      console.error('Verifier management error:', error);
      res.render('admin_verifier', {
        pageTitle: 'Verifier Management',
        user: req.session.user || null,
        verifiers: []
      });
    }
  },

  createVerifier: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const { name, email, phone, password, experienceYears } = req.body;
      if (!name || !email || !password || !experienceYears) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }
      const existingVerifier = await Verifier.findOne({ email });
      if (existingVerifier) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const newVerifier = new Verifier({
        name,
        email,
        phone,
        password: hashedPassword,
        experienceYears: Number(experienceYears)
      });
      await newVerifier.save();
      res.status(201).json({ success: true, message: 'Verifier created successfully', verifier: newVerifier });
    } catch (error) {
      console.error('Create verifier error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  updateVerifier: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const verifierId = req.params.id;
      const { name, email, phone, experienceYears } = req.body;
      const updatedVerifier = await Verifier.findByIdAndUpdate(
        verifierId,
        {
          name,
          email,
          phone,
          experienceYears: Number(experienceYears)
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

  deleteVerifier: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const verifierId = req.params.id;
      const deletedVerifier = await Verifier.findByIdAndDelete(verifierId);
      if (!deletedVerifier) {
        return res.status(404).json({ success: false, message: 'Verifier not found' });
      }
      await Trainer.updateMany(
        { verifierId },
        { $set: { verifierId: null } }
      );
      res.status(200).json({ success: true, message: 'Verifier deleted successfully' });
    } catch (error) {
      console.error('Delete verifier error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  getMemberships: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.redirect('/admin_login');
      }
      const memberships = await Membership.find().sort({ createdAt: -1 }).populate('user_id', 'full_name email');
      res.render('admin_membership', {
        pageTitle: 'Membership Management',
        user: req.session.user || null,
        memberships
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

  createMembership: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const { userId, type, startDate, endDate, price } = req.body;
      if (!userId || !type || !startDate || !endDate || !price) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      const newMembership = new Membership({
        user_id: userId,
        type,
        start_date: new Date(startDate),
        end_date: new Date(endDate),
        price: Number(price),
        status: 'Active'
      });
      await newMembership.save();
      await User.findByIdAndUpdate(userId, { membershipType: type });
      res.status(201).json({ success: true, message: 'Membership created successfully', membership: newMembership });
    } catch (error) {
      console.error('Create membership error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  updateMembership: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const membershipId = req.params.id;
      const { type, startDate, endDate, price, status } = req.body;
      const updatedMembership = await Membership.findByIdAndUpdate(
        membershipId,
        {
          type,
          start_date: startDate ? new Date(startDate) : undefined,
          end_date: endDate ? new Date(endDate) : undefined,
          price: price ? Number(price) : undefined,
          status
        },
        { new: true }
      );
      if (!updatedMembership) {
        return res.status(404).json({ success: false, message: 'Membership not found' });
      }
      if (status === 'Active') {
        await User.findByIdAndUpdate(updatedMembership.user_id, { membershipType: type });
      }
      res.status(200).json({ success: true, message: 'Membership updated successfully', membership: updatedMembership });
    } catch (error) {
      console.error('Update membership error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  deleteMembership: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const membershipId = req.params.id;
      const membership = await Membership.findById(membershipId);
      if (!membership) {
        return res.status(404).json({ success: false, message: 'Membership not found' });
      }
      await Membership.findByIdAndDelete(membershipId);
      await User.findByIdAndUpdate(membership.user_id, { membershipType: 'Basic' });
      res.status(200).json({ success: true, message: 'Membership deleted successfully' });
    } catch (error) {
      console.error('Delete membership error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  getNutritionPlans: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.redirect('/admin_login');
      }
      const nutritionPlans = await NutritionPlan.find().sort({ createdAt: -1 }).populate('creator', 'name').populate('userId', 'full_name');
      res.render('admin_nutrition', {
        pageTitle: 'Nutrition Plans',
        user: req.session.user || null,
        nutritionPlans
      });
    } catch (error) {
      console.error('Nutrition plan management error:', error);
      res.render('admin_nutrition', {
        pageTitle: 'Nutrition Plans',
        user: req.session.user || null,
        nutritionPlans: []
      });
    }
  },

  createNutritionPlan: async (req, res) => {
    try {
      res.status(501).json({ success: false, message: 'Not implemented yet' });
    } catch (error) {
      console.error('Create nutrition plan error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  updateNutritionPlan: async (req, res) => {
    try {
      res.status(501).json({ success: false, message: 'Not implemented yet' });
    } catch (error) {
      console.error('Update nutrition plan error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  deleteNutritionPlan: async (req, res) => {
    try {
      res.status(501).json({ success: false, message: 'Not implemented yet' });
    } catch (error) {
      console.error('Delete nutrition plan error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  getExercises: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.redirect('/admin_login');
      }
      const exercises = await Exercise.find().sort({ name: 1 });
      res.render('admin_exercises', {
        pageTitle: 'Exercise Library',
        user: req.session.user || null,
        exercises
      });
    } catch (error) {
      console.error('Exercise management error:', error);
      res.render('admin_exercises', {
        pageTitle: 'Exercise Library',
        user: req.session.user || null,
        exercises: []
      });
    }
  },

  createExercise: async (req, res) => {
    try {
      res.status(501).json({ success: false, message: 'Not implemented yet' });
    } catch (error) {
      console.error('Create exercise error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  updateExercise: async (req, res) => {
    try {
      res.status(501).json({ success: false, message: 'Not implemented yet' });
    } catch (error) {
      console.error('Update exercise error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  deleteExercise: async (req, res) => {
    try {
      res.status(501).json({ success: false, message: 'Not implemented yet' });
    } catch (error) {
      console.error('Delete exercise error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  getWorkoutPlans: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.redirect('/admin_login');
      }
      const workoutPlans = await WorkoutPlan.find().sort({ createdAt: -1 }).populate('creator', 'name').populate('userId', 'full_name');
      res.render('admin_workouts', {
        pageTitle: 'Workout Plans',
        user: req.session.user || null,
        workoutPlans
      });
    } catch (error) {
      console.error('Workout plan management error:', error);
      res.render('admin_workouts', {
        pageTitle: 'Workout Plans',
        user: req.session.user || null,
        workoutPlans: []
      });
    }
  },

  createWorkoutPlan: async (req, res) => {
    try {
      res.status(501).json({ success: false, message: 'Not implemented yet' });
    } catch (error) {
      console.error('Create workout plan error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  updateWorkoutPlan: async (req, res) => {
    try {
      res.status(501).json({ success: false, message: 'Not implemented yet' });
    } catch (error) {
      console.error('Update workout plan error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  deleteWorkoutPlan: async (req, res) => {
    try {
      res.status(501).json({ success: false, message: 'Not implemented yet' });
    } catch (error) {
      console.error('Delete workout plan error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  getSettings: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.redirect('/admin_login');
      }
      res.render('admin_settings', {
        pageTitle: 'Admin Settings',
        user: req.session.user || null
      });
    } catch (error) {
      console.error('Settings error:', error);
      res.render('admin_settings', {
        pageTitle: 'Admin Settings',
        user: req.session.user || null
      });
    }
  },

  updateSettings: async (req, res) => {
    try {
      res.status(501).json({ success: false, message: 'Not implemented yet' });
    } catch (error) {
      console.error('Update settings error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
};

module.exports = adminController;