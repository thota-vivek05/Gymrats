const User = require('../model/User');
const Trainer = require('../model/Trainer');
const Exercise = require('../model/Exercise');
const Membership = require('../model/Membership');
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
      const totalUsers = await User.countDocuments();
      const activeMembers = await User.countDocuments({ status: 'Active' });
      const platinumUsers = await User.countDocuments({ membershipType: 'Platinum' });
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const newSignups = await User.countDocuments({ 
        created_at: { $gte: oneWeekAgo }
      });

      res.render('admin_user', {
        pageTitle: 'User Management',
        user: req.session.user || null,
        users,
        stats: {
          totalUsers,
          activeMembers,
          platinumUsers,
          newSignups,
          totalUsersChange: '+12%',
          activeMembersChange: '+5%', 
          platinumUsersChange: '+12%',
          newSignupsChange: '+5%'
        }
      });
    } catch (error) {
      console.error('User management error:', error);
      res.render('admin_user', {
        pageTitle: 'User Management',
        user: req.session.user || null,
        users: [],
        stats: {
          totalUsers: 0,
          activeMembers: 0,
          platinumUsers: 0,
          newSignups: 0,
          totalUsersChange: '+0%',
          activeMembersChange: '+0%',
          platinumUsersChange: '+0%',
          newSignupsChange: '+0%'
        }
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
      const trainerCount = await Trainer.countDocuments({ status: 'Active' });
      const pendingApprovals = await TrainerApplication.countDocuments({ status: 'Pending' });
      
      // Calculate revenue using User model
      const users = await User.find({ status: 'Active' });
      let revenue = 0;
      const prices = {
        basic: 299,
        gold: 599,
        platinum: 999
      };
      users.forEach(user => {
        const remainingMonths = user.membershipDuration.months_remaining || 0;
        const price = prices[user.membershipType.toLowerCase()] || 0;
        revenue += remainingMonths * price;
      });

      // Count unique specializations using aggregation
      const specializationResult = await Trainer.aggregate([
        { $unwind: '$specializations' },
        { $group: { _id: '$specializations' } },
        { $count: 'uniqueCount' }
      ]);
      const specializationCount = specializationResult.length > 0 ? specializationResult[0].uniqueCount : 0;

      res.render('admin_trainers', {
        pageTitle: 'Trainer Management',
        user: req.session.user || null,
        trainers,
        stats: {
          totalTrainers: trainerCount,
          revenue,
          specializationCount,
          pendingApprovals
        }
      });
    } catch (error) {
      console.error('Trainer management error:', error);
      res.render('admin_trainers', {
        pageTitle: 'Trainer Management',
        user: req.session.user || null,
        trainers: [],
        stats: {
          totalTrainers: 0,
          revenue: 0,
          specializationCount: 0,
          pendingApprovals: 0
        }
      });
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
        specializations: specializations ? specializations.split(',').map(s => s.trim()) : [],
        status: 'Pending'
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
          specializations: specializations ? specializations.split(',').map(s => s.trim()) : [],
          status
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
      res.status(200).json({ success: true, message: 'Trainer deleted successfully' });
    } catch (error) {
      console.error('Delete trainer error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  // Membership Management
  // In adminController.js - getMemberships method (COMPLETE UPDATED VERSION)
getMemberships: async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/admin_login');
    }
    
    const memberships = await Membership.find({ user_id: { $ne: null } })
      .sort({ createdAt: -1 })
      .populate('user_id', 'full_name email');

    // Calculate real-time stats from MongoDB
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // FIXED: Aggregate for plan stats with correct pricing and months_remaining
    const agg = await User.aggregate([
      { 
        $match: { 
          status: 'Active',
          membershipType: { $in: ['Basic', 'Gold', 'Platinum'] }
        } 
      },
      {
        $addFields: {
          // Use months_remaining for revenue calculation, default to 1 if not set
          months_paid: {
            $cond: {
              if: { 
                $and: [
                  { $ifNull: ['$membershipDuration.months_remaining', false] },
                  { $gt: ['$membershipDuration.months_remaining', 0] }
                ]
              },
              then: '$membershipDuration.months_remaining',
              else: 1
            }
          },
          // FIXED: Use correct pricing based on membershipType
          monthly_price: {
            $switch: {
              branches: [
                { case: { $eq: ['$membershipType', 'Basic'] }, then: 299 },    // ₹299
                { case: { $eq: ['$membershipType', 'Gold'] }, then: 599 },     // ₹599
                { case: { $eq: ['$membershipType', 'Platinum'] }, then: 999 }, // ₹999
              ],
              default: 0
            }
          },
          // Calculate membership duration in months for retention
          membership_months: {
            $max: [
              1,
              {
                $ceil: {
                  $divide: [
                    { 
                      $subtract: [
                        new Date(), 
                        { $ifNull: ['$membershipDuration.start_date', '$created_at'] }
                      ] 
                    },
                    1000 * 60 * 60 * 24 * 30 // milliseconds in a month
                  ]
                }
              }
            ]
          }
        }
      },
      {
        $group: {
          _id: '$membershipType',
          active: { $sum: 1 },
          // FIXED: Multiply monthly_price by months_paid for total revenue
          revenue: { $sum: { $multiply: ['$monthly_price', '$months_paid'] } },
          retention: { $avg: '$membership_months' }
        }
      }
    ]);

    // Process aggregate results into planStats
    let planStats = {
      basic: { active: 0, revenue: 0, retention: 0 },
      gold: { active: 0, revenue: 0, retention: 0 },
      platinum: { active: 0, revenue: 0, retention: 0 }
    };

    agg.forEach(group => {
      const type = group._id ? group._id.toLowerCase() : 'basic';
      if (planStats[type]) {
        planStats[type] = {
          active: group.active || 0,
          revenue: group.revenue || 0,
          retention: group.retention || 0
        };
      }
    });

    // Calculate top-level stats
    const totalUsers = await User.countDocuments();
    const activeMembers = await User.countDocuments({ status: 'Active' });
    const premiumMembers = await User.countDocuments({ 
      status: 'Active', 
      membershipType: 'Platinum' 
    });
    const newSignups = await User.countDocuments({ 
      created_at: { $gte: oneWeekAgo } 
    });
    
    // Calculate total revenue from all plans
    const totalRevenue = agg.reduce((sum, group) => sum + (group.revenue || 0), 0);

    // Ensure all plan stats have values even if no users in that plan
    ['basic', 'gold', 'platinum'].forEach(plan => {
      if (!planStats[plan].active && !planStats[plan].revenue && !planStats[plan].retention) {
        planStats[plan] = { active: 0, revenue: 0, retention: 0 };
      }
    });

    res.render('admin_membership', {
      pageTitle: 'Membership Management',
      user: req.session.user || null,
      memberships: memberships || [],
      stats: {
        totalUsers,
        totalRevenue,
        activeMembers,
        premiumMembers,
        newSignups
      },
      planStats
    });
  } catch (error) {
    console.error('Membership management error:', error);
    res.render('admin_membership', {
      pageTitle: 'Membership Management',
      user: req.session.user || null,
      memberships: [],
      stats: {
        totalUsers: 0,
        totalRevenue: 0,
        activeMembers: 0,
        premiumMembers: 0,
        newSignups: 0
      },
      planStats: {
        basic: { active: 0, revenue: 0, retention: 0 },
        gold: { active: 0, revenue: 0, retention: 0 },
        platinum: { active: 0, revenue: 0, retention: 0 }
      }
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

  

  // Exercise Management - UPDATED
getExercises: async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.redirect('/admin_login');
        }
        
        const exercises = await Exercise.find().sort({ name: 1 });
        
        // Fixed list of primary muscle groups
        const fixedMuscleGroups = [
            "Chest", "Back", "Quadriceps", "Triceps", "Shoulders", 
            "Core", "Full Body", "Obliques", "Lower Abs", "Calves", 
            "Rear Shoulders", "Brachialis", "Biceps", "Arms", "Cardio", 
            "Legs", "Cardiovascular"
        ];
        
        // Calculate stats for the dashboard
        const totalExercises = await Exercise.countDocuments();
        const verifiedExercises = await Exercise.countDocuments({ verified: true });
        const unverifiedExercises = await Exercise.countDocuments({ verified: false });
        
        // Get most popular exercise
        const mostPopular = await Exercise.findOne().sort({ usageCount: -1 }).select('name usageCount');
        
        // Get exercise count by fixed muscle group
        const muscleGroupStats = {};
        fixedMuscleGroups.forEach(muscle => {
            muscleGroupStats[muscle] = exercises.filter(ex => 
                ex.primaryMuscle === muscle || 
                (ex.targetMuscles && ex.targetMuscles.includes(muscle))
            ).length;
        });

        res.render('admin_exercises', {
            pageTitle: 'Exercise Library',
            user: req.session.user || null,
            exercises,
            muscleGroups: fixedMuscleGroups,
            stats: {
                totalExercises,
                verifiedExercises,
                unverifiedExercises,
                mostPopular: mostPopular ? mostPopular.name : 'N/A',
                mostPopularCount: mostPopular ? mostPopular.usageCount : 0,
                verificationRate: totalExercises > 0 ? Math.round((verifiedExercises / totalExercises) * 100) : 0,
                totalMuscleGroups: fixedMuscleGroups.length
            }
        });
    } catch (error) {
        console.error('Exercise management error:', error);
        res.render('admin_exercises', {
            pageTitle: 'Exercise Library',
            user: req.session.user || null,
            exercises: [],
            muscleGroups: [],
            stats: {
                totalExercises: 0,
                verifiedExercises: 0,
                unverifiedExercises: 0,
                mostPopular: 'N/A',
                mostPopularCount: 0,
                verificationRate: 0,
                totalMuscleGroups: 0
            }
        });
    }
},

createExercise: async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const {
            name,
            category,
            difficulty,
            targetMuscles,
            instructions,
            type,
            defaultSets,
            defaultRepsOrDuration,
            equipment,
            movementPattern,
            primaryMuscle, // This is now REQUIRED
            secondaryMuscles,
            image
        } = req.body;

        // Validate required fields - primaryMuscle is now required
        if (!name || !category || !difficulty || !targetMuscles || !instructions || !type || !defaultRepsOrDuration || !primaryMuscle) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields. Primary muscle is required.' 
            });
        }

        const newExercise = new Exercise({
            name,
            category,
            difficulty,
            targetMuscles: Array.isArray(targetMuscles) ? targetMuscles : targetMuscles.split(',').map(m => m.trim()),
            instructions,
            type,
            defaultSets: defaultSets || 3,
            defaultRepsOrDuration,
            equipment: equipment ? (Array.isArray(equipment) ? equipment : equipment.split(',').map(e => e.trim())) : [],
            movementPattern: movementPattern || '',
            primaryMuscle: primaryMuscle, // This is crucial for filtering
            secondaryMuscles: secondaryMuscles ? (Array.isArray(secondaryMuscles) ? secondaryMuscles : secondaryMuscles.split(',').map(m => m.trim())) : [],
            image: image || '',
            verified: false,
            usageCount: 0,
            averageRating: 0,
            totalRatings: 0
        });

        await newExercise.save();
        
        res.status(201).json({ 
            success: true, 
            message: 'Exercise created successfully', 
            exercise: newExercise 
        });
    } catch (error) {
        console.error('Create exercise error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
},

 updateExercise: async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const exerciseId = req.params.id;
    const {
      name,
      category,
      difficulty,
      targetMuscles,
      instructions,
      type,
      defaultSets,
      defaultRepsOrDuration,
      equipment,
      movementPattern,
      primaryMuscle,
      secondaryMuscles,
      image,
      verified
    } = req.body;

    const updatedExercise = await Exercise.findByIdAndUpdate(
      exerciseId,
      {
        name,
        category,
        difficulty,
        targetMuscles: Array.isArray(targetMuscles) ? targetMuscles : targetMuscles.split(',').map(m => m.trim()),
        instructions,
        type,
        defaultSets,
        defaultRepsOrDuration,
        equipment: equipment ? (Array.isArray(equipment) ? equipment : equipment.split(',').map(e => e.trim())) : [],
        movementPattern,
        primaryMuscle,
        secondaryMuscles: secondaryMuscles ? (Array.isArray(secondaryMuscles) ? secondaryMuscles : secondaryMuscles.split(',').map(m => m.trim())) : [],
        image,
        verified: verified === 'true' || verified === true
      },
      { new: true }
    );

    if (!updatedExercise) {
      return res.status(404).json({ success: false, message: 'Exercise not found' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Exercise updated successfully', 
      exercise: updatedExercise 
    });
  } catch (error) {
    console.error('Update exercise error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
},

  deleteExercise: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const exerciseId = req.params.id;
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

  searchExercises: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      
      const { search } = req.query;
      let query = {};
      
      if (search && search.trim() !== '') {
        const searchRegex = new RegExp(search, 'i');
        query = {
          $or: [
            { name: searchRegex },
            { category: searchRegex },
            { difficulty: searchRegex },
            { targetMuscles: { $in: [searchRegex] } },
            { primaryMuscle: searchRegex }
          ]
        };
      }
      
      const exercises = await Exercise.find(query).sort({ name: 1 });
      
      res.json({
        success: true,
        exercises
      });
    } catch (error) {
      console.error('Search exercises error:', error);
      res.status(500).json({
        success: false,
        message: 'Error searching exercises'
      });
    }
  },
// Verifier Management
getVerifiers: async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/admin_login');
    }
    
    // Get all verifiers
    const verifiers = await Verifier.find().sort({ createdAt: -1 });
    const totalVerifiers = verifiers.length;
    
    // Calculate trainer statistics - ALL from TrainerApplication model for consistency
    const approvedTrainers = await TrainerApplication.countDocuments({ status: 'Approved' });
    const pendingTrainers = await TrainerApplication.countDocuments({ status: 'Pending' });
    const rejectedTrainers = await TrainerApplication.countDocuments({ status: 'Rejected' });

    console.log('Verifier Stats:', {
      totalVerifiers,
      approvedTrainers,
      pendingTrainers,
      rejectedTrainers
    });

    res.render('admin_verifier', {
      pageTitle: 'Verifier Management',
      user: req.session.user || null,
      verifiers,
      totalVerifiers: totalVerifiers || 0,
      approvedTrainers: approvedTrainers || 0,
      pendingTrainers: pendingTrainers || 0,
      rejectedTrainers: rejectedTrainers || 0
    });
  } catch (error) {
    console.error('Verifier management error:', error);
    // Make sure to pass all required variables even in error case
    res.render('admin_verifier', {
      pageTitle: 'Verifier Management',
      user: req.session.user || null,
      verifiers: [],
      totalVerifiers: 0,
      approvedTrainers: 0,
      pendingTrainers: 0,
      rejectedTrainers: 0
    });
  }
},

  createVerifier: async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const { name, email, password, phone, experienceYears } = req.body; // Added experienceYears
    
    console.log('Received verifier data:', { name, email, phone, experienceYears }); // Debug log
    
    if (!name || !email || !password || !phone || !experienceYears) { // Added experienceYears check
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields',
        received: { name, email, phone, experienceYears } // Debug info
      });
    }
    
    const existingVerifier = await Verifier.findOne({ email });
    if (existingVerifier) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newVerifier = new Verifier({
      name,
      email,
      password_hash: hashedPassword,
      phone,
      experienceYears: parseInt(experienceYears) // Make sure it's a number
    });
    
    await newVerifier.save();
    res.status(201).json({ success: true, message: 'Verifier created successfully', verifier: newVerifier });
  } catch (error) {
    console.error('Create verifier error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
},

  updateVerifier: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const verifierId = req.params.id;
      const { name, email, phone } = req.body;
      const updatedVerifier = await Verifier.findByIdAndUpdate(
        verifierId,
        {
          name,
          email,
          phone
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
      res.status(200).json({ success: true, message: 'Verifier deleted successfully' });
    } catch (error) {
      console.error('Delete verifier error:', error);
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
  },

  // Get Trainer Statistics API
  getTrainerStats: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // Total active trainers
      const totalTrainers = await Trainer.countDocuments({ status: 'Active' });
      
      // Calculate revenue using User model
      const users = await User.find({ status: 'Active' });
      let revenue = 0;
      const prices = {
        basic: 299,
        gold: 599,
        platinum: 999
      };
      users.forEach(user => {
        const remainingMonths = user.membershipDuration.months_remaining || 0;
        const price = prices[user.membershipType.toLowerCase()] || 0;
        revenue += remainingMonths * price;
      });

      // Count unique specializations using aggregation
      const specializationResult = await Trainer.aggregate([
        { $unwind: '$specializations' },
        { $group: { _id: '$specializations' } },
        { $count: 'uniqueCount' }
      ]);
      const specializationCount = specializationResult.length > 0 ? specializationResult[0].uniqueCount : 0;

      // Count pending trainer applications
      const pendingApprovals = await TrainerApplication.countDocuments({ status: 'Pending' });

      res.json({
        success: true,
        stats: {
          totalTrainers,
          revenue,
          specializationCount,
          pendingApprovals
        }
      });
    } catch (error) {
      console.error('Get trainer stats error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Search Trainers API
  searchTrainers: async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      
      const { search } = req.query;
      let query = {};
      
      console.log('Search query received:', search);
      
      // Build search query
      if (search && search.trim() !== '') {
        const searchRegex = new RegExp(search, 'i');
        query = {
          $or: [
            { name: searchRegex },
            { email: searchRegex },
            { specializations: { $in: [searchRegex] } }
          ]
        };
      }
      
      const trainers = await Trainer.find(query)
        .select('name email experience specializations status')
        .sort({ createdAt: -1 });
      
      console.log(`Found ${trainers.length} trainers for search: ${search}`);
      
      res.json({
        success: true,
        trainers
      });
    } catch (error) {
      console.error('Search trainers error:', error);
      res.status(500).json({
        success: false,
        message: 'Error searching trainers'
      });
    }
  }

}; // End of adminController object

module.exports = adminController;