const Verifier = require('../model/Verifier');
const TrainerApplication = require('../model/TrainerApplication');
const bcrypt = require('bcryptjs');
const path = require('path');

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
      const Trainer = require('../model/Trainer');
      
      // Check if trainer with same email already exists
      const existingTrainer = await Trainer.findOne({ email: application.email });
      if (existingTrainer) {
        return res.status(400).send("A trainer with this email already exists");
      }
      
      // Create new trainer from application data
      const newTrainer = new Trainer({
        name: `${application.firstName} ${application.lastName}`,
        email: application.email,
        password_hash: application.password_hash,
        phone: application.phone,
        experience: application.experience,
        specializations: application.specializations,
        verificationStatus: 'Approved',
        verifierId: verifierId,
        // Set default values for required fields not in application
        certifications: 'Other', // Default certification since it's required
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
    const verifier = await Verifier.findOne({ email });

    if (!verifier) {
      return res.status(401).render('verifier_login', {
        errorMessage: 'Invalid email or password.',
        successMessage: null,
        email
      });
    }

    const isMatch = await bcrypt.compare(password, verifier.password);
    if (!isMatch) {
      return res.status(401).render('verifier_login', {
        errorMessage: 'Incorrect password.',
        successMessage: null,
        email
      });
    }

    // Set session
    req.session.verifierId = verifier._id;
    res.redirect('/verifier');
  } catch (err) {
    console.error(err);
    res.status(500).render('verifier_login', {
      errorMessage: 'Something went wrong. Please try again later.',
      successMessage: null,
      email
    });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const verifier = await Verifier.findById(req.session.verifierId);
    if (!verifier) return res.redirect('/verifier/login');

    // Fetch verification stats
    const pendingCount = await TrainerApplication.countDocuments({ status: 'Pending' });
    const completedCount = await TrainerApplication.countDocuments({ status: 'Approved' });

    // Fetch recent verification requests (limit to 4 for display)
    const recentApplications = await TrainerApplication.find({
      status: { $in: ['Pending', 'In Progress'] }
    })
      .sort({ createdAt: -1 }) // Changed submittedDate to createdAt to match your schema
      .limit(4)
      .select('firstName lastName email specializations createdAt status _id'); // Added _id for the approve/reject links
    

    // Mock earnings and rating (since not in schema)
    const totalEarnings = 1250; // Rs 1,250 (mocked)
    const rating = 4.8; // 4.8/5 (mocked)

    // Fetch upcoming verifications (using submittedDate as a proxy for calendar events)
    const upcomingVerifications = await TrainerApplication.find({
      status: { $in: ['Pending', 'In Progress'] }
    })
      .sort({ createdAt: 1 }) // Changed submittedDate to createdAt
      .limit(3)
      .select('firstName lastName createdAt');

    // Mock recent messages (since no messaging schema is provided)
    const recentMessages = [
      {
        name: 'Varshi',
        email: 'varshi.m@example.com',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=40&h=40&fit=crop&auto=format',
        time: '2 hours ago',
        text: 'I’ve uploaded the additional documentation you requested for my verification.',
        unread: true
      },
      {
        name: 'Jayanth',
        email: 'jayanth.c@example.com',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&auto=format',
        time: '5 hours ago',
        text: 'Can we reschedule the video interview to tomorrow morning?',
        unread: true
      },
      {
        name: 'Admin Team',
        email: 'admin@example.com',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&auto=format',
        time: 'Yesterday',
        text: 'New verification standards have been updated. Please review the latest guidelines.',
        unread: false
      }
    ];

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
      recentApplications,
      upcomingVerifications,
      recentMessages
    });
  } catch (err) {
    console.error(err);
    res.redirect('/verifier/login');
  }
};

exports.getRegistrationPage = (req, res) => {
  res.render('verifier_form', { errorMessage: null });
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
    // Verify the user is logged in
    const verifierId = req.session.verifierId;
    console.log("verifierId:", verifierId);
    
    const verifier = await Verifier.findById(verifierId);
    console.log("verifier found:", verifier ? true : false);
    
    if (!verifier) {
      console.log("No verifier found, redirecting to login");
      return res.redirect('/verifier/login');
    }
    
    // Get pending applications
    console.log("Searching for pending applications...");
    const applications = await TrainerApplication.find({ status: 'Pending' })
                                .sort({ createdAt: -1 });
    
    console.log("Found applications:", applications.length);
    console.log("Applications data:", JSON.stringify(applications, null, 2));
    
    // Get counts for stats
    const pendingCount = await TrainerApplication.countDocuments({ status: 'Pending' });
    const completedCount = await TrainerApplication.countDocuments({ 
      status: { $in: ['Approved', 'Rejected'] },
      verifierId: verifierId
    });
    
    console.log("pendingCount:", pendingCount);
    console.log("completedCount:", completedCount);
    
    console.log("Rendering pendingverifications.ejs");
    return res.render('pendingverifications', { 
      applications: applications || [],
      verifier: {
        id: verifier._id,
        name: verifier.name,
        email: verifier.email
      },
      stats: {
        pendingCount,
        completedCount,
        rating: 4.8 // Default rating
      }
    });
  } catch (err) {
    console.error("Error in showPendingVerifications:", err);
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
      req.flash('error', 'Application not found.');
      return res.redirect('/verifier/pendingverifications');
    }
    
    // Update application status
    application.status = 'Approved';
    application.verifierId = verifierId;
    await application.save();
    
    // Import Trainer model
    const Trainer = require('../model/Trainer');
    
    // Create new trainer from application
    const newTrainer = new Trainer({
      name: `${application.firstName} ${application.lastName}`,
      email: application.email,
      password_hash: application.password_hash,
      phone: application.phone,
      experience: application.experience,
      specializations: application.specializations,
      verificationStatus: 'Approved',
      verifierId: verifierId,
      // Set default required values
      certifications: 'Other',
      status: 'Active'
    });
    
    await newTrainer.save();
    
    return res.redirect('/verifier/pendingverifications');
  } catch (err) {
    console.error("Error in approveTrainer:", err);
    return res.status(500).redirect('/verifier/pendingverifications');
  }
};
// Add rejection functionality
exports.rejectTrainer = async (req, res) => {
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