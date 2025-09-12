const User = require("../models/user");
const AddUser = require("../models/adduser");

// Fetch Team profile data
exports.SelectTeam = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      console.error("User is not logged in.");
      return res.redirect("/sign_in");
    }

    // Fetch user and team members concurrently
    const [user, teamMembers] = await Promise.all([
      User.findById(userId).select(
        "first_name last_name phone_number email company address user_img plan_name status denial_reason role"
      ),
      AddUser.find({ user_id: userId })
    ]);

    if (!user) {
      return res.redirect("/sign_in");
    }

    res.render("Teams/Teams", {
      users: teamMembers,
      profileImagePath: user.user_img || "/uploads/default.png",
      firstName: user.first_name,
      lastName: user.last_name,
      isUser: user.role === "user",
      plan_name: user.plan_name || "No Plan",
      status: user.status,
      reson: user.denial_reason,
    });
  } catch (error) {
    console.error("Error fetching team data:", error.message);
    return res.render("Teams/Teams", {
      users: [],
      error_msg: "Unable to load team data. Please try again."
    });
  }
};

// Add a new user
exports.addteams = async (req, res) => {
  try {
    const { name, email, address, phone } = req.body;
    const userId = req.session.userId;

    const newTeamMember = new AddUser({
      name,
      email,
      address,
      phone,
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
    const { id, name, email, address, phone } = req.body;
    
    await AddUser.findByIdAndUpdate(id, {
      name,
      email,
      address,
      phone
    });
    
    req.flash("success_msg", "Team member updated successfully!");
    res.redirect("/Teams");
  } catch (error) {
    console.error("Error updating team member:", error.message);
    req.flash("error_msg", "Failed to update team member. Please try again.");
    res.redirect("/Teams");
  }
};

// Delete Team
exports.deleteteam = async (req, res) => {
  try {
    const userId = req.params.id;
    
    await AddUser.findByIdAndDelete(userId);
    req.flash("success_msg", "Team member deleted successfully!");
    res.redirect("/Teams");
  } catch (error) {
    console.error("Error deleting team member:", error.message);
    req.flash("error_msg", "Failed to delete team member. Please try again.");
    res.redirect("/Teams");
  }
};
