const User = require("../models/user");
const bcrypt = require("bcrypt");

// Render admin page with the list of users
exports.admin = async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // Fetch all users
    const allUsers = await User.find().select(
      "first_name email phone_number role user_img plan_name company plan_limit"
    );
    
    // Find the logged-in user
    const loggedInUser = allUsers.find((user) => user._id.toString() === userId);
    if (!loggedInUser) {
      return res.redirect("/sign_in");
    }
    
    const profileImagePath = loggedInUser.user_img || "/uploads/default.png";
    
    // Filter out the logged-in user from the list
    const users = allUsers.filter((user) => user._id.toString() !== userId);
    
    res.render("admin/adminfile", {
      profileImagePath,
      firstName: loggedInUser.first_name,
      users: users,
    });
  } catch (error) {
    console.error("Error fetching admin data:", error.message);
    return res.render("admin/adminfile", {
      users: [],
      error_msg: "Unable to load admin data. Please try again."
    });
  }
};

// Update User
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { first_name, last_name, email, phone_number, plan_name, plan_limit } = req.body;

    await User.findByIdAndUpdate(userId, {
      first_name,
      last_name,
      email,
      phone_number,
      plan_name,
      plan_limit
    });

    req.flash("success_msg", "User updated successfully!");
    res.redirect("/admin");
  } catch (error) {
    console.error("Error updating user:", error.message);
    req.flash("error_msg", "Failed to update user. Please try again.");
    res.redirect("/admin");
  }
};

// Delete a user by ID
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    await User.findByIdAndDelete(userId);
    req.flash("success_msg", "User deleted successfully!");
    res.redirect("/admin");
  } catch (error) {
    console.error("Error deleting user:", error.message);
    req.flash("error_msg", "Failed to delete user. Please try again.");
    res.redirect("/admin");
  }
};

// Render the Add Admin page
exports.selectAddAdmin = async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // Fetch all users
    const allUsers = await User.find().select(
      "first_name last_name email phone_number role user_img plan_name"
    );
    
    const loggedInUser = allUsers.find((user) => user._id.toString() === userId);
    if (!loggedInUser) {
      return res.redirect("/sign_in");
    }
    
    const profileImagePath = loggedInUser.user_img || "/uploads/default.png";
    const users = allUsers.filter((user) => user._id.toString() !== userId);
    
    res.render("admin/addAdmin", {
      message: "",
      profileImagePath,
      firstName: loggedInUser.first_name,
      users: users,
    });
  } catch (error) {
    console.error("Error fetching admin data:", error.message);
    return res.render("admin/addAdmin", {
      users: [],
      error_msg: "Unable to load admin data. Please try again."
    });
  }
};

// Add an admin
exports.addAdmin = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone_number,
      password,
      role,
      plan_name,
      plan_limit,
    } = req.body;

    // Validate inputs
    if (
      !first_name ||
      !last_name ||
      !email ||
      !phone_number ||
      !password ||
      !role ||
      !plan_limit
    ) {
      req.flash("error_msg", "All fields are required.");
      return res.redirect("/addAdmin");
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      first_name,
      last_name,
      email,
      phone_number,
      password: hashedPassword,
      role,
      plan_name,
      plan_limit
    });

    await newUser.save();
    req.flash("success_msg", "Admin created successfully!");
    res.redirect("/addAdmin");
  } catch (error) {
    console.error("Error creating admin:", error.message);
    req.flash("error_msg", "Failed to create admin. Please try again.");
    res.redirect("/addAdmin");
  }
};
