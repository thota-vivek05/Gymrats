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

  // Verifiers Management
  getVerifiers: async (req, res) => {
    try {
      // Authentication check
      if (!req.session.userId) {
        return res.redirect('/login_signup');
      }

      const verifiers = await Verifier.find().sort({ contentReviewed: -1 });
      const totalVerifiers = await Verifier.countDocuments();
      const activeVerifiers = await Verifier.countDocuments({ status: 'Active' });
      const verifiedContent = verifiers.reduce((total, verifier) => total + verifier.contentReviewed, 0);
      const pendingApplications = await Verifier.countDocuments({ status: 'Pending' });
      
      res.render('admin_verifier', {
        pageTitle: 'Content Verifiers Management',
        user: req.session.user || null,
        verifiers,
        stats: {
          totalVerifiers,
          activeVerifiers,
          verifiedContent,
          pendingApplications
        }
      });
    } catch (error) {
      console.error('Verifiers management error:', error);
      res.render('admin_verifier', {
        pageTitle: 'Content Verifiers Management',
        user: req.session.user || null,
        verifiers: []
      });
    }
  },

  // Settings
  getSettings: (req, res) => {
    // Authentication check
    if (!req.session.userId) {
      return res.redirect('/login_signup');
    }
    
    res.render('admin_settings', {
      pageTitle: 'Admin Settings',
      user: req.session.user || null
    });
  },

  // Additional CRUD operations would be added here
};

module.exports = adminController;
