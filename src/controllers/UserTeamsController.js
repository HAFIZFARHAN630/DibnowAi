const User = require("../models/user");
const AddUser = require("../models/adduser");

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
      userUnreadCount = await Notification.countDocuments({
        userId: userId,
        isRead: false
      });
    }

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
    // Handle both JSON and form data
    let { name, email, role, department, phone } = req.body;

    // If data is not in req.body, try to parse from raw body
    if (!name && req.headers['content-type']?.includes('application/json')) {
      // Data should already be parsed by bodyParser
    }

    const userId = req.userId || req.session.userId;

    if (!name || !email || !role) {
      req.flash("error_msg", "All fields are required.");
      return res.redirect("/team/add");
    }

    // Get user to check plan limits
    const user = await User.findById(userId).select("plan_name");
    if (!user) {
      req.flash("error_msg", "User not found.");
      return res.redirect("/team/add");
    }

    // Check plan limits
    const planLimits = {
      'FREE': 2,
      'BASIC': 6,
      'STANDARD': 10,
      'PREMIUM': Infinity
    };

    const userLimit = planLimits[user.plan_name] || 0;

    // Count existing team members for this user
    const existingMembersCount = await AddUser.countDocuments({ user_id: userId });

    if (existingMembersCount >= userLimit) {
      req.flash("error_msg", "You have reached your team member limit. Please upgrade.");
      return res.redirect("/team/add");
    }

    // Create new team member
    const newTeamMember = new AddUser({
      name,
      email,
      role: role || 'Team Member',
      department: department || 'General',
      phone: phone || '',
      user_id: userId
    });

    await newTeamMember.save();
    req.flash("success_msg", "Team member added successfully!");
    res.redirect("/team/list");
  } catch (error) {
    console.error("Error creating team member:", error.message);
    req.flash("error_msg", "Failed to add team member. Please try again.");
    res.redirect("/team/add");
  }
};

// List User's Team Members
exports.listTeams = async (req, res) => {
  try {
    const userId = req.userId || req.session.userId;

    const user = await User.findById(userId).select(
      "first_name last_name user_img role plan_name status denial_reason"
    );

    if (!user) {
      return res.redirect("/sign_in");
    }

    // Fetch user's team members
    const teamMembers = await AddUser.find({ user_id: userId });

    // Get notification data for users
    let userNotifications = [];
    let userUnreadCount = 0;
    if (user.role === "user") {
      const Notification = require("../models/notification");
      userNotifications = await Notification.find({ userId: userId })
        .sort({ timestamp: -1 })
        .limit(10);
      userUnreadCount = await Notification.countDocuments({
        userId: userId,
        isRead: false
      });
    }

    res.render("userTeam/userAllTeam", {
      users: teamMembers,
      profileImagePath: user.user_img || "/uploads/default.png",
      firstName: user.first_name,
      lastName: user.last_name,
      isUser: user.role === "user",
      plan_name: user.plan_name || "No Plan",
      status: user.status,
      reson: user.denial_reason,
      userNotifications: userNotifications,
      userUnreadCount: userUnreadCount
    });
  } catch (error) {
    console.error("Error fetching user teams:", error.message);
    res.redirect("/index");
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