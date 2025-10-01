const User = require("../models/user");
const AddUser = require("../models/adduser");
const Notification = require("../models/notification");

// Show Add Team Form for Users
exports.addTeamForm = async (req, res) => {
  try {
    const userId = req.userId || req.session.userId;
    const user = await User.findById(userId).select(
      "first_name last_name user_img role plan_name status denial_reason"
    );

    if (!user) {
      return res.redirect("/sign_in");
    }

    // Get notification data for users
    let userNotifications = [];
    let userUnreadCount = 0;
    if (user.role === "user") {
      const Notification = require("../models/notification");
      userNotifications = await Notification.find({ userId: userId })
        .sort({ timestamp: -1 })
        .limit(10);
      userUnreadCount = await Notification.countDocuments({ userId: userId, isRead: false });
    }

    // Get current team count for plan limit display
    const currentTeamCount = await AddUser.countDocuments({ user_id: userId });
    const planLimits = {
      'FREE': 2,
      'FREE TRIAL': 2,
      'BASIC': 6,
      'STANDARD': 10,
      'PREMIUM': Infinity
    };
    const userPlanKey = user.plan_name?.toUpperCase();
    const userLimit = planLimits[userPlanKey] || 0;

    // Create plan limit message
    let planLimitMessage = null;
    if (userLimit > 0 && userLimit !== Infinity) {
      planLimitMessage = `Your ${user.plan_name} plan allows up to ${userLimit} team members. You currently have ${currentTeamCount} team members.`;
    } else if (userLimit === Infinity) {
      planLimitMessage = `Your ${user.plan_name} plan has unlimited team members.`;
    } else {
      planLimitMessage = `Your current plan does not allow team members. Please upgrade to add team members.`;
    }

    console.log("Rendering userTeam/add-team view");
    res.render("userTeam/add-team", {
      profileImagePath: user.user_img || "/uploads/default.png",
      firstName: user.first_name,
      lastName: user.last_name,
      isUser: user.role === "user",
      plan_name: user.plan_name || "No Plan",
      status: user.status,
      reson: user.denial_reason,
      userNotifications: userNotifications,
      userUnreadCount: userUnreadCount,
      message: null,
      planLimitMessage: planLimitMessage,
      currentTeamCount: currentTeamCount,
      teamLimit: userLimit
    });
  } catch (error) {
    console.error("Error loading add team form:", error.message);
    res.redirect("/index");
  }
};

// Create Team Member with Plan Limits
exports.createTeam = async (req, res) => {
  try {
    console.log('=== CREATE TEAM CONTROLLER CALLED ===');
    console.log('Request method:', req.method);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Request body:', req.body);
    console.log('User ID from middleware:', req.userId);
    console.log('Session user ID:', req.session.userId);

    // Handle both JSON and form data
    let { name, email, role, department, phone } = req.body;

    // Debug: Log raw request data
    console.log('Raw request body:', JSON.stringify(req.body, null, 2));
    console.log('Request headers:', req.headers);

    // If data is not in req.body, try to parse from raw body
    if (!name && req.headers['content-type']?.includes('application/json')) {
      // Data should already be parsed by bodyParser
    }

    // Get user ID from JWT token or session (consistent with other functions)
    const userIdString = req.userId || req.session.userId;
    console.log('User ID from JWT token or session:', userIdString);

    if (!userIdString) {
      console.log('No user ID found from JWT, redirecting to sign in');
      return res.redirect("/sign_in");
    }

    console.log('Final extracted data:', { name, email, role, department, phone });
    console.log('User ID string:', userIdString);

    if (!name || !email || !role) {
      req.flash("error_msg", "All fields are required.");
      return res.redirect("/userteam/add");
    }

    // Get user to check plan limits
    const user = await User.findById(userIdString).select("plan_name");
    if (!user) {
      req.flash("error_msg", "User not found.");
      return res.redirect("/userteam/add");
    }

    // Check plan limits
    const planLimits = {
      'FREE': 2,
      'FREE TRIAL': 2,
      'BASIC': 6,
      'STANDARD': 10,
      'PREMIUM': Infinity
    };
    // Case-insensitive plan name matching
    const userPlanKey = user.plan_name?.toUpperCase();
    const userLimit = planLimits[userPlanKey] || 0;

    // Count existing team members for this user
    console.log('Counting existing members with userId:', userIdString);
    let existingMembersCount = 0;

    try {
      // Try with string ID first
      existingMembersCount = await AddUser.countDocuments({ user_id: userIdString });
      console.log('String ID count:', existingMembersCount);
    } catch (error) {
      console.log('String ID count failed, trying ObjectId...');
      try {
        const mongoose = require('mongoose');
        const objectId = mongoose.Types.ObjectId(userIdString);
        existingMembersCount = await AddUser.countDocuments({ user_id: objectId });
        console.log('ObjectId count:', existingMembersCount);
      } catch (error2) {
        console.log('ObjectId count failed, trying MongoDB ObjectId...');
        try {
          const { ObjectId } = require('mongodb');
          const objectId = new ObjectId(userIdString);
          existingMembersCount = await AddUser.countDocuments({ user_id: objectId });
          console.log('MongoDB ObjectId count:', existingMembersCount);
        } catch (error3) {
          console.log('All count strategies failed, using 0');
          existingMembersCount = 0;
        }
      }
    }

    console.log('Debug: User plan:', user.plan_name);
    console.log('Debug: User team limit:', userLimit);
    console.log('Debug: Current team count:', existingMembersCount);

    if (existingMembersCount >= userLimit) {
       const planNames = {
         'FREE': 'FREE TRIAL',
         'BASIC': 'BASIC',
         'STANDARD': 'STANDARD',
         'PREMIUM': 'PREMIUM'
       };
       const planDisplayName = planNames[user.plan_name] || user.plan_name;

       let restrictionMessage = `Your current plan (${planDisplayName}) allows only ${userLimit} team members. `;

       // Add specific guidance for Free Trial users
       if (user.plan_name?.toUpperCase() === 'FREE TRIAL' || user.plan_name?.toUpperCase() === 'FREE') {
         restrictionMessage += `To add more team members, please upgrade to a paid plan. `;
         restrictionMessage += `Basic plan allows 6 members, Standard allows 10 members, and Premium has unlimited members.`;
       } else {
         restrictionMessage += `Please upgrade to a higher plan to increase your team limit.`;
       }

       // Create notification for plan limit exceeded
       if (req.app.locals.notificationService) {
         await req.app.locals.notificationService.createNotification(
           userIdString,
           user.first_name || 'User',
           `Team Limit Exceeded - ${planDisplayName} allows only ${userLimit} members`
         );
       }

       req.flash("error_msg", restrictionMessage);
       return res.redirect("/userteam/add");
     }

    // Create new team member
    console.log('Creating team member with data:', {
      name,
      email,
      role: role || 'Team Member',
      department: department || 'General',
      phone: phone || '',
      user_id: userIdString
    });

    const newTeamMember = new AddUser({
      name,
      email,
      role: role || 'Team Member',
      department: department || 'General',
      phone: phone || '',
      user_id: userIdString // MongoDB will handle string to ObjectId conversion
    });

    console.log('About to save team member to database...');
    console.log('Team member object before save:', newTeamMember);

    try {
       await newTeamMember.save();
       console.log("✅ Team member saved successfully:", newTeamMember);
       console.log("✅ Saved team member ID:", newTeamMember._id);
       console.log("✅ Saved team member data:", JSON.stringify(newTeamMember.toObject(), null, 2));

       // Create notification for successful team member addition
       if (req.app.locals.notificationService) {
         await req.app.locals.notificationService.createNotification(
           userIdString,
           user.first_name || 'User',
           `Team Member Added - ${name} joined your team`
         );
       }
     } catch (saveError) {
      console.error('❌ Save error details:', saveError);
      console.error('❌ Save error name:', saveError.name);
      console.error('❌ Save error message:', saveError.message);

      // If validation fails, try to save with minimal required data
      if (saveError.name === 'ValidationError') {
        console.log('⚠️ Attempting to save with minimal data...');
        const minimalMember = new AddUser({
          name: name || 'Unknown',
          email: email || 'unknown@example.com',
          role: 'Team Member',
          department: 'General',
          user_id: userIdString // MongoDB will handle string to ObjectId conversion
        });
        await minimalMember.save();
        console.log("✅ Minimal team member saved successfully:", minimalMember);
      } else {
        throw saveError;
      }
    }

    req.flash("success_msg", "Team member added successfully!");
    res.redirect("/userteam/list");
  } catch (error) {
    console.error("Error creating team member:", error.message);
    console.error("Error details:", error);
    console.error("Error stack:", error.stack);

    // Handle specific MongoDB errors
    if (error.code === 11000) {
      req.flash("error_msg", "A team member with this email already exists.");
    } else if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      req.flash("error_msg", validationErrors.join(", "));
    } else if (error.message.includes('ObjectId')) {
      req.flash("error_msg", "Invalid user session. Please sign in again.");
      return res.redirect("/sign_in");
    } else {
      req.flash("error_msg", "Failed to add team member. Please try again.");
    }
    res.redirect("/userteam/add");
  }
};

// List User's Team Members
exports.listTeams = async (req, res) => {
  try {
    console.log('=== LIST TEAMS CONTROLLER CALLED ===');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    console.log('User ID from middleware:', req.userId);
    console.log('Session user ID:', req.session.userId);

    // Get user ID from JWT token or session (consistent with addTeamForm)
    const userIdString = req.userId || req.session.userId;
    console.log('User ID from JWT token or session:', userIdString);

    if (!userIdString) {
       console.log('No user ID found from JWT, redirecting to sign in');
       return res.redirect("/sign_in");
     }

     // Get user information
     const user = await User.findById(userIdString).select(
       "first_name last_name user_img role plan_name status denial_reason"
     );
 
     if (!user) {
       console.log('User not found with ID:', userIdString);
       return res.redirect("/sign_in");
     }
 
     console.log('Found user:', user.first_name, user.last_name);
 
     // Debug: Check if team members exist for this user
     console.log('Debug: Checking team members for user:', userIdString);
 
     // Debug: Check if any team members exist at all in the database
     const totalTeamMembers = await AddUser.countDocuments({});
     console.log('Debug: Total team members in database:', totalTeamMembers);
 
     // Debug: Check team members for this specific user
     const userTeamMembers = await AddUser.countDocuments({ user_id: userIdString });
     console.log('Debug: Team members for this user:', userTeamMembers);
 
     // Debug: Check if user is admin
     console.log('Debug: User role:', user.role);
     console.log('Debug: User plan:', user.plan_name);
 
     // Determine if admin or user and fetch appropriate team members (same logic as AdminTeamsController)
     const isAdmin = user.role === "admin";
     console.log('Debug: Is user admin?', isAdmin);
 
     let finalTeamMembers = [];
 
     if (isAdmin) {
       // Admin sees all team members
       console.log('Debug: Fetching ALL team members for admin');
       finalTeamMembers = await AddUser.find({}).lean();
       console.log('Debug: Admin - Total team members found:', finalTeamMembers.length);
     } else {
       // Regular user sees only their own team members
       console.log('Debug: Fetching team members for regular user:', userIdString);
 
       try {
         // Strategy 1: Try with string ID first (most common case)
         finalTeamMembers = await AddUser.find({ user_id: userIdString }).lean();
         console.log('Strategy 1 (string ID) - Team members count:', finalTeamMembers.length);
       } catch (error) {
         console.log('Strategy 1 failed, trying ObjectId...');
         try {
           // Strategy 2: Try with mongoose ObjectId
           const mongoose = require('mongoose');
           const objectId = mongoose.Types.ObjectId(userIdString);
           finalTeamMembers = await AddUser.find({ user_id: objectId }).lean();
           console.log('Strategy 2 (mongoose ObjectId) - Team members count:', finalTeamMembers.length);
         } catch (error2) {
           console.log('Strategy 2 failed, trying MongoDB ObjectId...');
           try {
             // Strategy 3: Try with MongoDB ObjectId
             const { ObjectId } = require('mongodb');
             const objectId = new ObjectId(userIdString);
             finalTeamMembers = await AddUser.find({ user_id: objectId }).lean();
             console.log('Strategy 3 (MongoDB ObjectId) - Team members count:', finalTeamMembers.length);
           } catch (error3) {
             console.log('All strategies failed, using empty array');
             finalTeamMembers = [];
           }
         }
       }
     }

    // Get notification data for users
    let userNotifications = [];
    let userUnreadCount = 0;
    if (user.role === "user") {
      const Notification = require("../models/notification");
      userNotifications = await Notification.find({ userId: userIdString })
        .sort({ timestamp: -1 })
        .limit(10);
      userUnreadCount = await Notification.countDocuments({ userId: userIdString, isRead: false });
    }

    console.log("Rendering userTeam/userAllTeam view with", finalTeamMembers.length, "team members");

     // Debug: Log the actual data being passed to the view
     console.log('Debug: Final team members data:', JSON.stringify(finalTeamMembers, null, 2));
     console.log('Debug: First team member (if any):', finalTeamMembers[0]);

     // Ensure users array is always defined
     const usersToRender = finalTeamMembers || [];

     console.log('Debug: Users to render count:', usersToRender.length);
     console.log('Debug: Users to render type:', typeof usersToRender);

     // Add plan limit information to the team list view
     const planLimits = {
       'FREE': 2,
       'FREE TRIAL': 2,
       'BASIC': 6,
       'STANDARD': 10,
       'PREMIUM': Infinity
     };
     const userPlanKey = user.plan_name?.toUpperCase();
     const userLimit = planLimits[userPlanKey] || 0;

     let planLimitInfo = null;
     if (userLimit > 0 && userLimit !== Infinity) {
       planLimitInfo = `Your ${user.plan_name} plan allows up to ${userLimit} team members. You currently have ${usersToRender.length} team members.`;
     } else if (userLimit === Infinity) {
       planLimitInfo = `Your ${user.plan_name} plan has unlimited team members.`;
     } else {
       planLimitInfo = `Your current plan does not allow team members. Please upgrade to add team members.`;
     }

     res.render("userTeam/userAllTeam", {
      users: usersToRender,
      profileImagePath: user.user_img || "/uploads/default.png",
      firstName: user.first_name,
      lastName: user.last_name,
      isUser: user.role === "user",
      plan_name: user.plan_name || "No Plan",
      status: user.status,
      reson: user.denial_reason,
      userNotifications: userNotifications,
      userUnreadCount: userUnreadCount,
      planLimitInfo: planLimitInfo,
      currentTeamCount: usersToRender.length,
      teamLimit: userLimit
    });
  } catch (error) {
    console.error("Error fetching user teams:", error.message);
    console.error("Error stack:", error.stack);

    // Even if there's an error, render the page with empty users array
    res.render("userTeam/userAllTeam", {
      users: [],
      profileImagePath: "/uploads/default.png",
      firstName: "User",
      lastName: "",
      isUser: true,
      plan_name: "FREE",
      status: "active",
      reson: null,
      userNotifications: [],
      userUnreadCount: 0
    });
  }
};

// Update User Team Member
exports.updateUserTeam = async (req, res) => {
  try {
    console.log('=== UPDATE USER TEAM CONTROLLER CALLED ===');
    console.log('Update request received:', req.body);
    console.log('User ID from middleware:', req.userId);
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);

    const { id, name, email, role, department, phone } = req.body;

    if (!id || !name || !email) {
      console.log('Missing required fields');
      return res.json({ success: false, message: "All fields are required." });
    }

    console.log('Attempting to update user team member with ID:', id);
    const updatedUser = await AddUser.findByIdAndUpdate(id, {
      name,
      email,
      role: role || 'Team Member',
      department: department || 'General',
      phone: phone || ''
    }, { new: true });

    if (!updatedUser) {
      console.log('User team member not found with ID:', id);
      return res.json({ success: false, message: "Team member not found." });
    }

    console.log('User team member updated successfully:', updatedUser);
    res.json({ success: true, message: "Team member updated successfully!" });
  } catch (error) {
    console.error("Error updating user team member:", error);
    res.json({ success: false, message: error.message || "Failed to update team member." });
  }
};

// Delete User Team Member
exports.deleteUserTeam = async (req, res) => {
  try {
    console.log('=== DELETE USER TEAM CONTROLLER CALLED ===');
    const teamMemberId = req.params.id;
    console.log('Delete request received for ID:', teamMemberId);
    console.log('User ID from middleware:', req.userId);
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);

    if (!teamMemberId) {
      console.log('No team member ID provided');
      return res.json({ success: false, message: "Team member ID is required." });
    }

    console.log('Attempting to delete user team member with ID:', teamMemberId);
    const deletedUser = await AddUser.findByIdAndDelete(teamMemberId);

    if (!deletedUser) {
      console.log('User team member not found with ID:', teamMemberId);
      return res.json({ success: false, message: "Team member not found." });
    }

    console.log('User team member deleted successfully:', deletedUser);
    res.json({ success: true, message: "Team member deleted successfully!" });
  } catch (error) {
    console.error("Error deleting user team member:", error);
    res.json({ success: false, message: error.message || "Failed to delete team member." });
  }
};