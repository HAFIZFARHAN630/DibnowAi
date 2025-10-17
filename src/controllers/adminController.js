const User = require("../models/user");
const Wallet = require("../models/wallet");
const Transaction = require("../models/transaction");
const PaymentSettings = require("../models/paymentSettings");
const Payments = require("../models/payments");
const bcrypt = require("bcrypt");
const infoModel = require("../models/info");
const upload = require("../middlewares/uploadMiddleware");
const mongoose = require("mongoose");


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
    
    // Get notification data
    const Notification = require("../models/notification");
    const notifications = await Notification.find().sort({ timestamp: -1 }).limit(10);
    const unreadCount = await Notification.countDocuments({ isRead: false });
    
    res.render("admin/adminfile", {
      profileImagePath,
      firstName: loggedInUser.first_name,
      email: loggedInUser.email,
      users: users,
      notifications: notifications,
      unreadCount: unreadCount,
      isAdmin: loggedInUser.role === "admin",
      isUser: loggedInUser.role === "user"
    });
  } catch (error) {
    console.error("Error fetching admin data:", error.message);
    return res.render("admin/adminfile", {
      users: [],
      notifications: [],
      unreadCount: 0,
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
    
    // Get notification data
    const Notification = require("../models/notification");
    const notifications = await Notification.find().sort({ timestamp: -1 }).limit(10);
    const unreadCount = await Notification.countDocuments({ isRead: false });
    
    res.render("admin/addAdmin", {
      message: "",
      profileImagePath,
      firstName: loggedInUser.first_name,
      email: loggedInUser.email,
      users: users,
      notifications: notifications,
      unreadCount: unreadCount,
      isAdmin: loggedInUser.role === "admin",
      isUser: loggedInUser.role === "user"
    });
  } catch (error) {
    console.error("Error fetching admin data:", error.message);
    return res.render("admin/addAdmin", {
      users: [],
      notifications: [],
      unreadCount: 0,
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
    res.redirect("/admin");
  } catch (error) {
    console.error("Error creating admin:", error.message);
    req.flash("error_msg", "Failed to create admin. Please try again.");
    res.redirect("/addAdmin");
  }
};

// Add a user
exports.addUser = async (req, res) => {
  try {
    const {
      first_name,
      email,
      phone_number,
      company,
      plan_name,
      plan_limit,
    } = req.body;

    // Create new user with default values
    const newUser = new User({
      first_name,
      email,
      phone_number,
      company,
      plan_name,
      plan_limit,
      role: "user",
      password: await bcrypt.hash("defaultpassword123", 10)
    });

    await newUser.save();
    req.flash("success_msg", "User created successfully!");
    res.redirect("/admin");
  } catch (error) {
    console.error("Error creating user:", error.message);
    req.flash("error_msg", "Failed to create user. Please try again.");
    res.redirect("/admin");
  }
};

// Wallet Management - Admin overview
exports.walletManagement = async (req, res) => {
  try {
    const userId = req.session.userId;

    // Fetch current user for profile
    const user = await User.findById(userId).select("first_name user_img");
    if (!user) {
      return res.redirect("/sign_in");
    }

    const profileImagePath = user.user_img || "/uploads/default.png";

    // Fetch users with wallets
    const usersWithWallets = await User.aggregate([
      {
        $lookup: {
          from: 'wallets',
          localField: '_id',
          foreignField: 'user',
          as: 'wallet'
        }
      },
      {
        $lookup: {
          from: 'repairs',
          localField: '_id',
          foreignField: 'user_id',
          as: 'repairs'
        }
      },
      {
        $lookup: {
          from: 'inventories',
          localField: '_id',
          foreignField: 'user_id',
          as: 'inventories'
        }
      },
      {
        $match: { $expr: { $gt: [{ $size: '$wallet' }, 0] } }
      },
      {
        $project: {
          first_name: 1,
          last_name: 1,
          email: 1,
          plan_name: 1,
          plan_limit: 1,
          balance: { $ifNull: [{ $arrayElemAt: ['$wallet.balance', 0] }, 0] },
          quota_used: { $add: [{ $size: '$repairs' }, { $size: '$inventories' }] }
        }
      }
    ]);

    // Aggregates
    const totalWallets = usersWithWallets.length;
    const totalBalance = usersWithWallets.reduce((sum, u) => sum + u.balance, 0);
    const lowBalanceUsers = usersWithWallets.filter(u => u.balance < 10).length;
    const totalTransactions = await Transaction.countDocuments();

    // Get notification data
    const Notification = require("../models/notification");
    const notifications = await Notification.find().sort({ timestamp: -1 }).limit(10);
    const unreadCount = await Notification.countDocuments({ isRead: false });

    res.render("admin/wallet", {
      profileImagePath,
      firstName: user.first_name,
      email: user.email,
      usersWithWallets,
      totalWallets,
      totalBalance,
      lowBalanceUsers,
      totalTransactions,
      notifications,
      unreadCount,
      isAdmin: true,
      isUser: false,
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg")
    });
  } catch (error) {
    console.error("Error fetching wallet management data:", error.message);
    req.flash("error_msg", "Unable to load wallet management. Please try again.");
    res.redirect("/admin");
  }
};

// Payment Settings - GET
exports.paymentSettings = async (req, res) => {
  try {
    const userId = req.session.userId;

    // Fetch current user for profile
    const user = await User.findById(userId).select("first_name user_img");
    if (!user) {
      return res.redirect("/sign_in");
    }

    const profileImagePath = user.user_img || "/uploads/default.png";

    // Fetch all payment settings
    const settings = await PaymentSettings.find().lean();

    // Group by gateway
    const stripeSettings = settings.find(s => s.gateway === 'stripe');
    const paypalSettings = settings.find(s => s.gateway === 'paypal');
    const bankSettings = settings.find(s => s.gateway === 'bank');

    // Get notification data
    const Notification = require("../models/notification");
    const notifications = await Notification.find().sort({ timestamp: -1 }).limit(10);
    const unreadCount = await Notification.countDocuments({ isRead: false });

    res.render("admin/payment-settings", {
      profileImagePath,
      firstName: user.first_name,
      email: user.email,
      notifications,
      unreadCount,
      stripeSettings,
      paypalSettings,
      bankSettings,
      isAdmin: true,
      isUser: false,
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg")
    });
  } catch (error) {
    console.error("Error fetching payment settings:", error.message);
    req.flash("error_msg", "Unable to load payment settings.");
    res.redirect("/admin");
  }
};

// Payment Settings - POST
exports.updatePaymentSettings = async (req, res) => {
  try {
    const {
      stripe_enabled, stripe_publishable_key, stripe_secret_key,
      paypal_enabled, paypal_client_id, paypal_client_secret,
      bank_enabled
    } = req.body;

    // Update Stripe
    await PaymentSettings.findOneAndUpdate(
      { gateway: 'stripe' },
      {
        enabled: stripe_enabled === 'on',
        publishable_key: stripe_publishable_key || '',
        secret_key: stripe_secret_key || ''
      },
      { upsert: true, new: true }
    );

    // Update PayPal
    await PaymentSettings.findOneAndUpdate(
      { gateway: 'paypal' },
      {
        enabled: paypal_enabled === 'on',
        client_id: paypal_client_id || '',
        client_secret: paypal_client_secret || ''
      },
      { upsert: true, new: true }
    );

    // Update Bank
    await PaymentSettings.findOneAndUpdate(
      { gateway: 'bank' },
      {
        enabled: bank_enabled === 'on'
      },
      { upsert: true, new: true }
    );

    req.flash("success_msg", "Payment settings updated successfully!");
    res.redirect("/payment-settings");
  } catch (error) {
    console.error("Error updating payment settings:", error.message);
    req.flash("error_msg", "Failed to update payment settings.");
    res.redirect("/payment-settings");
  }
};

// Active Users
exports.activeUsers = async (req, res) => {
  try {
    const userId = req.session.userId;

    // Fetch current user for profile
    const user = await User.findById(userId).select("first_name user_img");
    if (!user) {
      return res.redirect("/sign_in");
    }

    const profileImagePath = user.user_img || "/uploads/default.png";

    // Fetch active payments
    const currentDate = new Date();
    const activePayments = await Payments.find({
      expiryDate: { $gt: currentDate },
      status: 'active'
    }).populate('user', 'first_name last_name email').lean();

    // Fetch active Free Trial users from PlanRequest
    const PlanRequest = require("../models/planRequest");
    const activeFreeTrials = await PlanRequest.find({
      expiryDate: { $gt: currentDate },
      status: 'Active',
      planName: 'Free Trial'
    }).populate('user', 'first_name last_name email').lean();

    // Combine both arrays and remove duplicates based on user._id
    const allActiveUsers = [...activePayments, ...activeFreeTrials];
    const uniqueActiveUsers = allActiveUsers.filter((item, index, self) =>
      item.user &&
      item.user._id &&
      index === self.findIndex(t => t.user && t.user._id && t.user._id.toString() === item.user._id.toString())
    );

    console.log(`Found ${activePayments.length} active payment users and ${activeFreeTrials.length} active Free Trial users`);
    console.log(`Total unique active users: ${uniqueActiveUsers.length}`);

    // Log any entries with missing user data for debugging
    const entriesWithNullUsers = allActiveUsers.filter(item => !item.user || !item.user._id);
    if (entriesWithNullUsers.length > 0) {
      console.log(`Warning: Found ${entriesWithNullUsers.length} entries with missing user data`);
    }

    // Get notification data
    const Notification = require("../models/notification");
    const notifications = await Notification.find().sort({ timestamp: -1 }).limit(10);
    const unreadCount = await Notification.countDocuments({ isRead: false });

    res.render("admin/activeUsers", {
      profileImagePath,
      firstName: user.first_name,
      email: user.email,
      activeUsers: uniqueActiveUsers,
      notifications,
      unreadCount,
      isAdmin: true,
      isUser: false,
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg")
    });
  } catch (error) {
    console.error("Error fetching active users:", error.message);
    req.flash("error_msg", "Unable to load active users.");
    res.redirect("/admin");
  }
};

// Expired Users
exports.expiredUsers = async (req, res) => {
  try {
    const userId = req.session.userId;

    // Fetch current user for profile
    const user = await User.findById(userId).select("first_name user_img");
    if (!user) {
      return res.redirect("/sign_in");
    }

    const profileImagePath = user.user_img || "/uploads/default.png";

    // Fetch expired payments
    const currentDate = new Date();
    const expiredUsers = await Payments.find({
      expiryDate: { $lt: currentDate },
      status: { $ne: 'expired' } // to avoid double listing
    }).populate('user', 'first_name last_name email').lean();

    // Update status to expired
    await Payments.updateMany(
      { expiryDate: { $lt: currentDate }, status: 'active' },
      { status: 'expired' }
    );

    // Get notification data
    const Notification = require("../models/notification");
    const notifications = await Notification.find().sort({ timestamp: -1 }).limit(10);
    const unreadCount = await Notification.countDocuments({ isRead: false });

    res.render("admin/expiredUsers", {
      profileImagePath,
      firstName: user.first_name,
      email: user.email,
      expiredUsers,
      notifications,
      unreadCount,
      isAdmin: true,
      isUser: false,
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg")
    });
  } catch (error) {
    console.error("Error fetching expired users:", error.message);
    req.flash("error_msg", "Unable to load expired users.");
    res.redirect("/admin");
  }
};







exports.settings = async (req, res) => {
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
    // Create a new collection name info and save title and description and favicon in that
    const infoCollection = await mongoose.connection.createCollection("info");
    const infoData = await infoModel.findOne({});

    // Provide default values if no info document exists
    const info = infoData || {
      title: '',
      favicon: '',
      description: '',
      welcome_description: '',
      navbar_color: '#3B82F6'
    };

    res.render("admin/adminSettings", {
      info:info,
      message: "",
      profileImagePath,
      firstName: loggedInUser.first_name,
      email: loggedInUser.email,
      isUser: loggedInUser.role === "user",
      isAdmin: loggedInUser.role === "admin",
      users: users,
      title: info.title,
      description: info.description,
    });
  } catch (error) {
    console.log(error)
    res.send("error in settings page")
  }
}


exports.notificationSettingsPage = async (req, res) => {
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
    // Create a new collection name info and save title and description and favicon in that
    const infoCollection = await mongoose.connection.createCollection("info");
    const infoData = await infoModel.findOne({});
    const notificationSettings = await NotificationSettings.findOne({});

    // Provide default values if no info document exists
    const info = infoData || {
      title: '',
      favicon: '',
      description: '',
      welcome_description: '',
      navbar_color: '#3B82F6'
    };

    res.render("admin/notificationSettings", {
      notificationSettings: notificationSettings,
      info:info,
      message: "",
      profileImagePath,
      firstName: loggedInUser.first_name,
      email: loggedInUser.email,
      isUser: loggedInUser.role === "user",
      isAdmin: loggedInUser.role === "admin",
      users: users,
      title: "Website title",
      description: "Website description",
    });
  } catch (error) {
    console.log(error)
  }
}




exports.saveNotificationSettingsPage = async (req, res) => {
  try {
    const {
      emailNotification,
      systemImportantChange,
      outOfStockItems,
      repairDeviceTracking,
      newDeviceSignupEmail,
      dailyProfitReport,
    } = req.body;

    await NotificationSettings.findOneAndUpdate(
      {}, // find any (since you only have one settings doc)
      {
        emailNotification: emailNotification === "on",
        systemImportantChange: systemImportantChange === "on",
        outOfStockItems: outOfStockItems === "on",
        repairDeviceTracking: repairDeviceTracking === "on",
        newDeviceSignupEmail: newDeviceSignupEmail === "on",
        dailyProfitReport: dailyProfitReport === "on",
      },
      { upsert: true, new: true } // create if none exists, else update
    );

    req.flash("success_msg", "Notification Settings saved successfully!");
    res.redirect("/notification-settings");
  } catch (error) {
    console.log(error);
  }
};






exports.saveSettings = async (req, res) => {
  try {
    const title = req.body.title;
    const favicon = req.file?.filename;

    const newInfo = await infoModel.findOneAndUpdate(
      {},
      {
        $set: {
          title: title,
          favicon: favicon ? favicon : req.body.existingFavicon,
          description: req.body.description,
          navbar_color: req.body.navbar_color,
          welcome_description: req.body.welcome_description
        }
      },
      { new: true, upsert: true }
    );

    if (!newInfo) {
      req.flash("error_msg", "Failed to update settings. Please try again.");
      return res.redirect("/admin-settings");
    }

    req.flash("success_msg", "Settings updated successfully!");
    res.redirect("/admin-settings");
  } catch (error) {
    console.error("Error updating settings:", error.message);
    req.flash("error_msg", "An error occurred. Please try again.");
    res.redirect("/admin-settings");
  }
};
