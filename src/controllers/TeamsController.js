const User = require("../models/user");
const AddUser = require("../models/adduser");
const Plan = require("../models/plan.model");

// Fetch Team profile data
exports.SelectTeam = async (req, res) => {
  try {
    const userId = req.userId || req.session.userId;
    if (!userId) {
      console.error("User is not logged in.");
      return res.redirect("/sign_in");
    }

    // Fetch user and team members
    const user = await User.findById(userId).select(
      "first_name last_name phone_number email company address user_img plan_name status denial_reason role"
    );

    if (!user) {
      return res.redirect("/sign_in");
    }

    // Determine if admin or user and fetch appropriate team members
    const isAdmin = user.role === "admin";
    const teamMembers = isAdmin ? await AddUser.find({}) : await AddUser.find({ user_id: userId });

    // Get notification data for admin
    let notifications = [];
    let unreadCount = 0;
    if (isAdmin) {
      const Notification = require("../models/notification");
      notifications = await Notification.find().sort({ timestamp: -1 }).limit(10);
      unreadCount = await Notification.countDocuments({ isRead: false });
    }

    res.render("Teams/Teams", {
      users: teamMembers,
      profileImagePath: user.user_img || "/uploads/default.png",
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      isUser: user.role === "user",
      isAdmin: isAdmin,
      plan_name: user.plan_name || "No Plan",
      status: user.status,
      reson: user.denial_reason,
      notifications: notifications,
      unreadCount: unreadCount
    });
  } catch (error) {
    console.error("Error fetching team data:", error.message);
    return res.render("Teams/Teams", {
      users: [],
      isAdmin: false,
      profileImagePath: "/uploads/default.png",
      firstName: "User",
      lastName: "",
      isUser: true,
      plan_name: "No Plan",
      status: "",
      reson: "",
      notifications: [],
      unreadCount: 0,
      error_msg: "Unable to load team data. Please try again."
    });
  }
};



// Add a new user
exports.addteams = async (req, res) => {
  try {
    const { name, email, address, phone, department, role } = req.body;
    const userId = req.userId || req.session.userId;

    const newTeamMember = new AddUser({
      name,
      email,
      address,
      phone,
      department: department || 'Team',
      role: role || 'Team Member',
      user_id: userId
    });

    await newTeamMember.save();
    req.flash("success_msg", "User added successfully!");
    res.redirect("/Teams");
  } catch (error) {
    console.error("Error adding team member:", error.message);
    req.flash("error_msg", "Failed to add user. Please try again.");
    res.redirect("/Teams");
  }
};

// Update Team Controller
exports.updateteam = async (req, res) => {
  try {
    console.log('=== UPDATE TEAM CONTROLLER CALLED ===');
    console.log('Update request received:', req.body);
    console.log('User ID from middleware:', req.userId);
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    
    const { id, name, email, phone, department, role } = req.body;
    
    if (!id || !name || !email || !phone) {
      console.log('Missing required fields');
      return res.json({ success: false, message: "All fields are required." });
    }
    
    console.log('Attempting to update team member with ID:', id);
    
    const updatedUser = await AddUser.findByIdAndUpdate(id, {
      name,
      email,
      phone,
      department: department || 'Team',
      role: role || 'Team Member'
    }, { new: true });
    
    if (!updatedUser) {
      console.log('Team member not found with ID:', id);
      return res.json({ success: false, message: "Team member not found." });
    }
    
    console.log('Team member updated successfully:', updatedUser);
    res.json({ success: true, message: "Team member updated successfully!" });
  } catch (error) {
    console.error("Error updating team member:", error);
    res.json({ success: false, message: error.message || "Failed to update team member." });
  }
};

// Delete Team
exports.deleteteam = async (req, res) => {
  try {
    console.log('=== DELETE TEAM CONTROLLER CALLED ===');
    const teamMemberId = req.params.id;
    
    console.log('Delete request received for ID:', teamMemberId);
    console.log('User ID from middleware:', req.userId);
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    
    if (!teamMemberId) {
      console.log('No team member ID provided');
      return res.json({ success: false, message: "Team member ID is required." });
    }
    
    console.log('Attempting to delete team member with ID:', teamMemberId);
    
    const deletedUser = await AddUser.findByIdAndDelete(teamMemberId);
    
    if (!deletedUser) {
      console.log('Team member not found with ID:', teamMemberId);
      return res.json({ success: false, message: "Team member not found." });
    }
    
    console.log('Team member deleted successfully:', deletedUser);
    res.json({ success: true, message: "Team member deleted successfully!" });
  } catch (error) {
    console.error("Error deleting team member:", error);
    res.json({ success: false, message: error.message || "Failed to delete team member." });
  }
};

// Show Add Team Member Form
exports.showAddTeamMemberForm = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId).select(
      "first_name last_name user_img role plan_name status denial_reason"
    );

    if (!user) {
      return res.redirect("/sign_in");
    }

    // Get notification data for admin
    let notifications = [];
    let unreadCount = 0;
    if (user.role === "admin") {
      const Notification = require("../models/notification");
      notifications = await Notification.find().sort({ timestamp: -1 }).limit(10);
      unreadCount = await Notification.countDocuments({ isRead: false });
    }

    res.render("adminTeam/add_team_member", {
      profileImagePath: user.user_img || "/uploads/default.png",
      firstName: user.first_name,
      lastName: user.last_name,
      isUser: user.role === "user",
      plan_name: user.plan_name || "No Plan",
      status: user.status,
      reson: user.denial_reason,
      notifications: notifications,
      unreadCount: unreadCount,
      message: null
    });
  } catch (error) {
    console.error("Error loading add team member form:", error.message);
    res.redirect("/Teams");
  }
};

// Add Admin Team Member
exports.addAdminTeamMember = async (req, res) => {
  try {
    const { Username, Email, password, Number, role, department } = req.body;
    const userId = req.userId || req.session.userId;

    const newAdminTeamMember = new AddUser({
      name: Username,
      email: Email,
      phone: Number,
      role: role,
      department: department,
      user_id: userId
    });

    await newAdminTeamMember.save();
    req.flash("success_msg", "Team member created successfully!");
    res.redirect("/Teams");
  } catch (error) {
    console.error("Error creating admin team member:", error.message);
    req.flash("error_msg", "Failed to create team member. Please try again.");
    res.redirect("/AdminTeam");
  }
};

// Show Add Team Form for Users
exports.addTeamForm = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId).select(
      "first_name last_name user_img role plan_name status denial_reason"
    );

    if (!user) {
      return res.redirect("/sign_in");
    }

    // Get notification data for admin
    let notifications = [];
    let unreadCount = 0;
    if (user.role === "admin") {
      const Notification = require("../models/notification");
      notifications = await Notification.find().sort({ timestamp: -1 }).limit(10);
      unreadCount = await Notification.countDocuments({ isRead: false });
    }

    res.render("team/add-team", {
      profileImagePath: user.user_img || "/uploads/default.png",
      firstName: user.first_name,
      lastName: user.last_name,
      isUser: user.role === "user",
      plan_name: user.plan_name || "No Plan",
      status: user.status,
      reson: user.denial_reason,
      notifications: notifications,
      unreadCount: unreadCount,
      message: null
    });
  } catch (error) {
    console.error("Error loading add team form:", error.message);
    res.redirect("/index");
  }
};

// Create Team Member with Plan Limits
exports.createTeam = async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const userId = req.userId;

    if (!name || !email || !role) {
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(400).json({ success: false, message: "All fields are required." });
      }
      req.flash("error_msg", "All fields are required.");
      return res.redirect("/team/add");
    }

    // Get user to check plan limits
    const user = await User.findById(userId).select("plan_name first_name");
    if (!user) {
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(404).json({ success: false, message: "User not found." });
      }
      req.flash("error_msg", "User not found.");
      return res.redirect("/team/add");
    }

    // Fetch plan limit from database
    const userPlan = await Plan.findOne({ plan_name: { $regex: new RegExp(`^${user.plan_name}$`, 'i') } });
    const userLimit = userPlan?.teams === 'unlimited' ? Infinity : parseInt(userPlan?.teams || 0);

    // Count existing team members for this user
    const existingMembersCount = await AddUser.countDocuments({ user_id: userId });

    if (existingMembersCount >= userLimit) {
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(403).json({
          success: false,
          limitReached: true,
          message: `You have reached your limit of ${userLimit}. Please upgrade your plan.`
        });
      }
      req.flash("error_msg", `You have reached your limit of ${userLimit}. Please upgrade your plan.`);
      return res.redirect("/team/add");
    }

    // Create new team member
    const newTeamMember = new AddUser({
      name,
      email,
      role: role || 'Team Member',
      user_id: userId
    });

    await newTeamMember.save();
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({ success: true, message: "Team member added successfully" });
    }
    
    req.flash("success_msg", "Team member added successfully!");
    res.redirect("/team/list");
  } catch (error) {
    console.error("Error creating team member:", error.message);
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(500).json({ success: false, message: "Failed to add team member. Please try again." });
    }
    req.flash("error_msg", "Failed to add team member. Please try again.");
    res.redirect("/team/add");
  }
};

// List User's Team Members
exports.listTeams = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId).select(
      "first_name last_name user_img role plan_name status denial_reason"
    );

    if (!user) {
      return res.redirect("/sign_in");
    }

    // Fetch user's team members
    const teamMembers = await AddUser.find({ user_id: userId });

    // Get notification data for admin
    let notifications = [];
    let unreadCount = 0;
    if (user.role === "admin") {
      const Notification = require("../models/notification");
      notifications = await Notification.find().sort({ timestamp: -1 }).limit(10);
      unreadCount = await Notification.countDocuments({ isRead: false });
    }

    res.render("team/userAllTeam", {
      users: teamMembers,
      profileImagePath: user.user_img || "/uploads/default.png",
      firstName: user.first_name,
      lastName: user.last_name,
      isUser: user.role === "user",
      plan_name: user.plan_name || "No Plan",
      status: user.status,
      reson: user.denial_reason,
      notifications: notifications,
      unreadCount: unreadCount
    });
  } catch (error) {
    console.error("Error fetching user teams:", error.message);
    res.redirect("/index");
  }
};

// Get All Admin Team Members
exports.getAllAdminTeam = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select("first_name last_name user_img role plan_name status denial_reason");

    if (!user || user.role !== "admin") {
      return res.redirect("/index");
    }

    const adminTeamMembers = await AddUser.find({}).populate('user_id', 'first_name last_name email');

    const Notification = require("../models/notification");
    const notifications = await Notification.find().sort({ timestamp: -1 }).limit(10);
    const unreadCount = await Notification.countDocuments({ isRead: false });

    res.render("adminTeam/all_admin_team", {
      teamMembers: adminTeamMembers,
      profileImagePath: user.user_img || "/uploads/default.png",
      firstName: user.first_name,
      lastName: user.last_name,
      isUser: false,
      plan_name: user.plan_name || "No Plan",
      status: user.status,
      reson: user.denial_reason,
      notifications: notifications,
      unreadCount: unreadCount
    });
  } catch (error) {
    console.error("Error fetching admin team:", error.message);
    res.redirect("/index");
  }
};
