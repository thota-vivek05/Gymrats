const Verifier = require('../model/Verifier');
const TrainerApplication = require('../model/TrainerApplication');
const Trainer = require('../model/Trainer'); // Import at top level
const bcrypt = require('bcryptjs');

exports.getLoginPage = (req, res) => {
  res.render('verifier_login', { errorMessage: null, successMessage: null, email: '' });
};

exports.getVerificationDetails = async (req, res) => {
  try {
    const applicationId = req.params.id;
    const application = await TrainerApplication.findById(applicationId);
    
    if (!application) {
      return res.status(404).send("Application not found");
    }
    
    return res.render('verification_review', {
      application: application,
      verifier: { id: req.session.verifierId }
    });
  } catch (err) {
    console.error("Error in getVerificationDetails:", err);
    return res.status(500).send("Error loading verification details");
  }
};

exports.processVerification = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const applicationId = req.params.id;
    const verifierId = req.session.verifierId;
    
    if (!['Approved', 'Rejected', 'In Progress'].includes(status)) {
      return res.status(400).send("Invalid status");
    }
    
    const application = await TrainerApplication.findById(applicationId);
    
    if (!application) {
      return res.status(404).send("Application not found");
    }
    
    // Update application status
    application.status = status;
    application.verificationNotes = notes;
    application.verifierId = verifierId;
    await application.save();
    
    // If approved, create a new Trainer record
    if (status === 'Approved') {
      // Check if trainer with same email already exists
      const existingTrainer = await Trainer.findOne({ email: application.email });
      if (existingTrainer) {
        return res.status(400).send("A trainer with this email already exists");
      }
      
      // Create new trainer from application data
      const newTrainer = new Trainer({
        name: `${application.firstName} ${application.lastName}`,
        email: application.email,
        password: application.password,
        phone: application.phone,
        experience: application.experience,
        specializations: application.specializations,
        verificationStatus: 'Approved',
        verifierId: verifierId,
        // Set default values for required fields not in application
        certifications: ['Other'], // Default certification since it's required
        status: 'Active'
      });
      
      await newTrainer.save();
    }
    
    return res.redirect('/verifier/pendingverifications');
  } catch (err) {
    console.error("Error in processVerification:", err);
    return res.status(500).send("Error processing verification");
  }
};

exports.loginVerifier = async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log("=== LOGIN ATTEMPT ===");
    console.log("Email:", email);
    
    const verifier = await Verifier.findOne({ email });

    if (!verifier) {
      console.log("Verifier not found");
      return res.status(401).render('verifier_login', {
        errorMessage: 'Invalid email or password.',
        successMessage: null,
        email
      });
    }

    const isMatch = await bcrypt.compare(password, verifier.password);
    if (!isMatch) {
      console.log("Password mismatch");
      return res.status(401).render('verifier_login', {
        errorMessage: 'Incorrect password.',
        successMessage: null,
        email
      });
    }

    // Set session
    console.log("Setting session for verifier:", verifier._id);
    req.session.verifierId = verifier._id;
    
    // Verify session was set
    console.log("Session after setting:", req.session);
    
    res.redirect('/verifier');
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).render('verifier_login', {
      errorMessage: 'Something went wrong. Please try again later.',
      successMessage: null,
      email
    });
  }
};

//REYNA
exports.getDashboard = async (req, res) => {
  try {
    console.log("=== GET DASHBOARD ===");
    console.log("Session:", req.session);
    console.log("Session verifierId:", req.session.verifierId);
    
    const verifier = await Verifier.findById(req.session.verifierId);
    if (!verifier) {
      console.log("No verifier found, redirecting to login");
      return res.redirect('/verifier/login');
    }

    // FIX: Update pendingCount to include both statuses
    const pendingCount = await TrainerApplication.countDocuments({ 
      status: { $in: ['Pending', 'In Progress'] }
    });
    const completedCount = await TrainerApplication.countDocuments({ 
      status: { $in: ['Approved', 'Rejected'] }
    });

    // Fetch recent verification requests (limit to 4 for display)
    const recentApplications = await TrainerApplication.find({
      status: { $in: ['Pending', 'In Progress'] }
    })
      .sort({ createdAt: -1 })
      .limit(4)
      .select('firstName lastName email specializations createdAt status _id');

    // Mock earnings and rating (since not in schema)
    const totalEarnings = 1250;
    const rating = 4.8;

    // Fetch upcoming verifications
    const upcomingVerifications = await TrainerApplication.find({
      status: { $in: ['Pending', 'In Progress'] }
    })
      .sort({ createdAt: 1 })
      .limit(3)
      .select('firstName lastName createdAt');

    // Fetch recent approved trainers (NEW: Replace messages with approved trainers)
    const recentApprovedTrainers = await TrainerApplication.find({
      status: 'Approved'
    })
      .sort({ updatedAt: -1 })
      .limit(3)
      .select('firstName lastName email specializations updatedAt');

    console.log("Rendering dashboard with:", {
      verifier: verifier.name,
      pendingCount,
      completedCount,
      recentApplicationsCount: recentApplications.length,
      recentApprovedTrainersCount: recentApprovedTrainers.length
    });

    res.render('verifier', {
      verifier: {
        name: verifier.name,
        email: verifier.email
      },
      stats: {
        pendingCount,
        completedCount,
        totalEarnings,
        rating
      },
      recentApplications: recentApplications || [], // Ensure this is always defined
      upcomingVerifications,
      recentApprovedTrainers: recentApprovedTrainers || [] // NEW: Replace messages with approved trainers
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.redirect('/verifier/login');
  }
};

exports.getRegistrationPage = (req, res) => {
  res.render('verifier_form', { errorMessage: null });
};

// REYNA
// Add this to your verifierController.js
exports.requireAuth = (req, res, next) => {
  if (!req.session.verifierId) {
    console.log("Auth required - redirecting to login");
    return res.redirect('/verifier/login');
  }
  next();
};

exports.registerVerifier = async (req, res) => {
  const {
    fullName,
    email,
    phone,
    password,
    experienceYears
  } = req.body;

  if (experienceYears < 5) {
    return res.status(400).render('verifier_form', {
      errorMessage: 'You need a minimum of 5 years of experience to be a verifier.'
    });
  }

  try {
    const existingVerifier = await Verifier.findOne({ email });
    if (existingVerifier) {
      return res.status(400).render('verifier_form', {
        errorMessage: 'Email is already in use.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newVerifier = new Verifier({
      name: fullName,
      email,
      phone,
      password: hashedPassword,
      experienceYears
    });

    await newVerifier.save();
    res.render('verifier_login', {
      successMessage: 'Registration successful! Please log in.',
      errorMessage: null,
      email
    });
  } catch (err) {
    console.error(err);
    res.render('verifier_form', {
      errorMessage: 'Registration failed. Please try again.'
    });
  }
};

exports.showPendingVerifications = async (req, res) => {
  try {
    console.log("=== showPendingVerifications START ===");
    
    // Verify the user is logged in
    const verifierId = req.session.verifierId;
    console.log("Session verifierId:", verifierId);
    
    const verifier = await Verifier.findById(verifierId);
    console.log("Verifier found:", verifier ? verifier.name : "NO VERIFIER");
    
    if (!verifier) {
      console.log("No verifier found, redirecting to login");
      return res.redirect('/verifier/login');
    }
    
    // Get pending AND in-progress applications
    console.log("Searching for applications with status: ['Pending', 'In Progress']");
    const applications = await TrainerApplication.find({ 
      status: { $in: ['Pending', 'In Progress'] }
    }).sort({ createdAt: -1 });
    
    console.log("Found applications:", applications.length);
    
    const pendingCount = await TrainerApplication.countDocuments({ 
      status: { $in: ['Pending', 'In Progress'] }
    });
    
    console.log("Total pending count:", pendingCount);
    console.log("=== showPendingVerifications END ===");
    
    return res.render('pendingverifications', { 
      applications: applications || [],
      verifier: {
        id: verifier._id,
        name: verifier.name,
        email: verifier.email
      },
      stats: {
        pendingCount,
        completedCount: await TrainerApplication.countDocuments({ 
          status: { $in: ['Approved', 'Rejected'] }
        }),
        rating: 4.8
      }
    });
  } catch (err) {
    console.error("Error in showPendingVerifications:", err);
    return res.status(500).redirect('/verifier');
  }
};

// REYNA
// Show approved verifications
exports.showApprovedVerifications = async (req, res) => {
  try {
    console.log("=== showApprovedVerifications START ===");
    
    const verifierId = req.session.verifierId;
    console.log("Session verifierId:", verifierId);
    
    const verifier = await Verifier.findById(verifierId);
    console.log("Verifier found:", verifier ? verifier.name : "NO VERIFIER");
    
    if (!verifier) {
      console.log("No verifier found, redirecting to login");
      return res.redirect('/verifier/login');
    }
    
    // Get approved applications
    console.log("Searching for applications with status: 'Approved'");
    const applications = await TrainerApplication.find({ 
      status: 'Approved'
    }).sort({ updatedAt: -1 });
    
    console.log("Found approved applications:", applications.length);
    
    const approvedCount = await TrainerApplication.countDocuments({ 
      status: 'Approved'
    });
    
    console.log("Total approved count:", approvedCount);
    console.log("=== showApprovedVerifications END ===");
    
    return res.render('approvedverifications', { 
      applications: applications || [],
      verifier: {
        id: verifier._id,
        name: verifier.name,
        email: verifier.email
      },
      stats: {
        approvedCount,
        pendingCount: await TrainerApplication.countDocuments({ 
          status: { $in: ['Pending', 'In Progress'] }
        }),
        rejectedCount: await TrainerApplication.countDocuments({ 
          status: 'Rejected'
        }),
        rating: 4.8
      }
    });
  } catch (err) {
    console.error("Error in showApprovedVerifications:", err);
    return res.status(500).redirect('/verifier');
  }
};

// Show rejected verifications
exports.showRejectedVerifications = async (req, res) => {
  try {
    console.log("=== showRejectedVerifications START ===");
    
    const verifierId = req.session.verifierId;
    console.log("Session verifierId:", verifierId);
    
    const verifier = await Verifier.findById(verifierId);
    console.log("Verifier found:", verifier ? verifier.name : "NO VERIFIER");
    
    if (!verifier) {
      console.log("No verifier found, redirecting to login");
      return res.redirect('/verifier/login');
    }
    
    // Get rejected applications
    console.log("Searching for applications with status: 'Rejected'");
    const applications = await TrainerApplication.find({ 
      status: 'Rejected'
    }).sort({ updatedAt: -1 });
    
    console.log("Found rejected applications:", applications.length);
    
    const rejectedCount = await TrainerApplication.countDocuments({ 
      status: 'Rejected'
    });
    
    console.log("Total rejected count:", rejectedCount);
    console.log("=== showRejectedVerifications END ===");
    
    return res.render('rejectedverifications', { 
      applications: applications || [],
      verifier: {
        id: verifier._id,
        name: verifier.name,
        email: verifier.email
      },
      stats: {
        rejectedCount,
        pendingCount: await TrainerApplication.countDocuments({ 
          status: { $in: ['Pending', 'In Progress'] }
        }),
        approvedCount: await TrainerApplication.countDocuments({ 
          status: 'Approved'
        }),
        rating: 4.8
      }
    });
  } catch (err) {
    console.error("Error in showRejectedVerifications:", err);
    return res.status(500).redirect('/verifier');
  }
};

exports.approveTrainer = async (req, res) => {
  try {
    const applicationId = req.params.id;
    const verifierId = req.session.verifierId;
    
    // Find the verifier
    const verifier = await Verifier.findById(verifierId);
    if (!verifier) {
      return res.redirect('/verifier/login');
    }
    
    // Find the application
    const application = await TrainerApplication.findById(applicationId);
    if (!application) {
      return res.redirect('/verifier/pendingverifications');
    }
    
    // Check if trainer already exists
    const existingTrainer = await Trainer.findOne({ email: application.email });
    if (existingTrainer) {
      return res.status(400).send("A trainer with this email already exists");
    }
    
    // Update application status
    application.status = 'Approved';
    application.verifierId = verifierId;
    await application.save();
    
    // Create new trainer from application
    const newTrainer = new Trainer({
      name: `${application.firstName} ${application.lastName}`,
      email: application.email,
      password: application.password,
      phone: application.phone,
      experience: application.experience,
      specializations: application.specializations,
      verificationStatus: 'Approved',
      verifierId: verifierId,
      // Set default required values
      certifications: ['Other'], // Changed to array to match schema
      status: 'Active'
    });
    
    await newTrainer.save();
    
    return res.redirect('/verifier/approvedverifications');
  } catch (err) {
    console.error("Error in approveTrainer:", err);
    return res.status(500).redirect('/verifier/pendingverifications');
  }
};

exports.rejectTrainer = async (req, res) => {
  try {
    const applicationId = req.params.id;
    const verifierId = req.session.verifierId;
    
    const verifier = await Verifier.findById(verifierId);
    if (!verifier) {
      return res.redirect('/verifier/login');
    }
    
    const application = await TrainerApplication.findById(applicationId);
    if (!application) {
      return res.redirect('/verifier/pendingverifications');
    }
    
    // Update application status
    application.status = 'Rejected';
    application.verifierId = verifierId;
    await application.save();
    
    return res.redirect('/verifier/pendingverifications');
  } catch (err) {
    console.error("Error in rejectTrainer:", err);
    return res.status(500).redirect('/verifier/pendingverifications');
  }
};