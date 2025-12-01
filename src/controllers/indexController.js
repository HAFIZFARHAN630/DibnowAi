const User = require("../models/user");
const Wallet = require("../models/wallet");
const Payments = require("../models/payments");
const PlanRequest = require("../models/planRequest");
const Repair = require("../models/repair");
const Inventory = require("../models/inventery");
const SoldItem = require("../models/Sold_Products");
const AddUser = require("../models/adduser");
const Complaint = require("../models/complaint");
const Brand = require("../models/brand");
const Category = require("../models/categories");

exports.allusers = async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      req.flash("error_msg", "Please log in first.");
      return res.redirect("/sign_in");
    }

    // Fetch user profile
    const user = await User.findById(userId).select(
      "first_name last_name phone_number email company address user_img country currency plan_name role status denial_reason"
    );

    if (!user) {
      req.flash("error_msg", "User not found.");
      return res.redirect("/sign_in");
    }

    // Fetch all data concurrently
    let [
      repairs,
      inventory,
      productCount,
      soldCount,
      soldItems,
      repairCount,
      pendingOrders,
      completedRepairs,
      teams,
      teamCount,
      subscription,
      matchedPackage,
      latestPayment,
      userPlan,
      // New user count queries for admin
      totalUsers,
      activeUsers,
      expiredUsers,
      freeTrialUsers,
      paidUsers,
      // Complaint counts
      totalComplaints,
      pendingComplaints,
      completedComplaints,
      // Brands and Categories
      brands,
      categories
    ] = await Promise.all([
      Repair.find({ user_id: userId }).sort({ _id: -1 }),
      Inventory.find({ user_id: userId }).sort({ _id: -1 }),
      Inventory.countDocuments({ user_id: userId }),
      SoldItem.countDocuments({ user_id: userId }),
      SoldItem.find({ user_id: userId }).sort({ sale_date: -1 }).limit(100), // Fetch recent sold items with sale dates
      Repair.countDocuments({ user_id: userId }),
      Repair.countDocuments({ status: 'Booking', user_id: userId }),
      Repair.countDocuments({ status: 'Completed', user_id: userId }),
      // Role-based team filtering
      user.role === 'admin'
        ? AddUser.find().select('name') // Admin sees all team members
        : AddUser.find({ user_id: userId }).select('name'), // User sees only their own team members
      user.role === 'admin'
        ? AddUser.countDocuments() // Admin sees total team count
        : AddUser.countDocuments({ user_id: userId }), // User sees their own team count
      PlanRequest.findOne({ user: userId, status: 'Active' }).sort({ createdAt: -1 }),
      Payments.findOne({ user: userId, status: 'active' }).sort({ createdAt: -1 }),
      Payments.findOne({ user: userId, status: 'active' }).sort({ createdAt: -1 }),
      PlanRequest.findOne({ user: userId, status: 'Active', invoiceStatus: 'Paid' }).sort({ createdAt: -1 }),
      // User count queries for admin dashboard
      User.countDocuments(),
      PlanRequest.countDocuments({ status: 'Active', invoiceStatus: 'Paid' }),
      PlanRequest.countDocuments({ status: 'Expired' }),
      PlanRequest.countDocuments({ planName: { $in: ['Free Trial', 'FREE TRIAL', 'FREE_TRIAL'] }, status: 'Active' }),
      PlanRequest.countDocuments({ planName: { $nin: ['Free Trial', 'FREE TRIAL', 'FREE_TRIAL'] }, status: 'Active', invoiceStatus: 'Paid' }),
      // Complaint counts for admin dashboard
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: 'Pending' }),
      Complaint.countDocuments({ status: 'Complete' }),
      // Fetch brands and categories
      Brand.find({ user_id: userId }).select('name description').sort({ _id: -1 }),
      Category.find({ user_id: userId }).select('name description').sort({ _id: -1 })
    ]);

    // Role-based repair sales query (fetch after Promise.all)
    const deliveredRepairs = await (user.role === 'admin'
      ? Repair.find({ status: 'Delivered' }).select('Price') // Admin sees all delivered repairs
      : Repair.find({ status: 'Delivered', user_id: userId }).select('Price')); // User sees only their own

    // Prioritize paid plans over Free Trial
    if (!userPlan && latestPayment) {
      // If no paid PlanRequest but has active Payment, use Payment data
      userPlan = {
        planName: latestPayment.plan,
        status: 'Active',
        invoiceStatus: 'Paid',
        amount: latestPayment.amount,
        startDate: latestPayment.startDate,
        expiryDate: latestPayment.expiryDate,
        description: `${latestPayment.plan} plan activated via ${latestPayment.gateway}`
      };
    }

    // Auto-assign Free Trial for new users (only if no plan at all)
    if (!userPlan && !latestPayment && subscription) {
      // Check if subscription is Free Trial
      if (subscription.planName === 'Free Trial' || subscription.planName === 'FREE TRIAL') {
        userPlan = subscription;
      }
    }

    // If still no plan, create Free Trial
    if (!userPlan && !latestPayment) {
      const trialExpiryDate = new Date();
      trialExpiryDate.setDate(trialExpiryDate.getDate() + 7);

      const freeTrialPlan = new PlanRequest({
        user: userId,
        planName: "Free Trial",
        status: "Active",
        startDate: new Date(),
        expiryDate: trialExpiryDate,
        invoiceStatus: "Unpaid",
        amount: 0,
        description: "Free Trial Plan - 7 days access"
      });

      userPlan = await freeTrialPlan.save();
      await User.findByIdAndUpdate(userId, { plan_name: "Free Trial", plan_limit: 30 });
    }

    console.log(`🔍 Dashboard data for: ${user.email}`);
    console.log('📊 Final plan:', userPlan ? { planName: userPlan.planName, status: userPlan.status, invoiceStatus: userPlan.invoiceStatus } : null);
    console.log('👥 User counts:', { totalUsers, activeUsers, expiredUsers, freeTrialUsers, paidUsers });

    // Calculate comprehensive sales data
    const repairSales = deliveredRepairs.reduce((sum, repair) => sum + (repair.Price || 0), 0);
    const productSales = soldItems.reduce((sum, item) => sum + (parseFloat(item.Price) || 0), 0);
    const totalSales = repairSales + productSales;
    const totalRepairs = deliveredRepairs.length;

    // Calculate sales growth percentage (current month vs previous month)
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const currentMonthSales = soldItems
      .filter(item => new Date(item.sale_date) >= currentMonthStart)
      .reduce((sum, item) => sum + (parseFloat(item.Price) || 0), 0);

    const previousMonthSales = soldItems
      .filter(item => {
        const saleDate = new Date(item.sale_date);
        return saleDate >= previousMonthStart && saleDate <= previousMonthEnd;
      })
      .reduce((sum, item) => sum + (parseFloat(item.Price) || 0), 0);

    const salesGrowth = previousMonthSales > 0 
      ? ((currentMonthSales - previousMonthSales) / previousMonthSales) * 100 
      : (currentMonthSales > 0 ? 100 : 0);

    // Format total sales for display
    const formattedTotalSales = totalSales >= 1000 ? `${(totalSales / 1000).toFixed(1)}K` : totalSales.toFixed(0);

    // Apply plan limit restrictions for teams display
    const userPlanLimit = user.plan_limit || 30;
    const isFreePlan = user.plan_name === 'FREE TRIAL' || user.plan_name === 'Free Trial';
    const maxTeamsToShow = isFreePlan ? Math.min(5, userPlanLimit) : teams.length;

    // Apply role-based filtering and plan limits to teams
    let filteredTeams = teams;
    if (user.role === 'user') {
      // For regular users, limit based on plan
      filteredTeams = teams.slice(0, maxTeamsToShow);
    }

    const profileImagePath = user.user_img || "/uploads/default.png";

    // Prevent caching of dashboard data
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.render("index", {
      profileImagePath,
      firstName: user.first_name,
      lastName: user.last_name,
      phoneNumber: user.phone_number,
      email: user.email,
      company: user.company,
      address: user.address,
      country: user.country,
      currency: user.currency,
      products: repairs,
      inventory,
      productCount,
      soldCount,
      soldItems,
      repairCount,
      pendingOrders,
      completedRepairs,
      teamCount,
      teams: filteredTeams, // Use filtered teams with plan limits applied

      status: user.status,
      reson: user.denial_reason,

      plan_name: user.plan_name || "No Plan",
      totalSales,
      totalRepairs,
      formattedTotalSales,
      salesGrowth,
      subscription,
      matchedPackage,
      latestPayment,
      userPlan,
      isUser: user.role === 'user',
      isAdmin: user.role === 'admin', // Add admin check for template
      // User count data for admin dashboard
      totalUsers,
      activeUsers,
      expiredUsers,
      freeTrialUsers,
      paidUsers,
      // Complaint counts for admin dashboard
      totalComplaints,
      pendingComplaints,
      completedComplaints,
      // Brands and Categories
      brands: brands || [],
      categories: categories || [],
      // Team member login info (with defaults to prevent undefined errors)
      isTeamMember: req.session.isTeamMember || false,
      teamMemberName: req.session.teamMemberName || '',
      teamMemberEmail: req.session.teamMemberEmail || '',
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg"),
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error.message);
    req.flash("error_msg", "Unable to load dashboard. Please try again.");
    res.redirect("/sign_in");
  }
};

// accept the Status
exports.accept = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required." });
    }

    const result = await User.findByIdAndUpdate(
      userId,
      { status: 'Accepted' },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "User not found or already accepted.",
      });
    }

    req.flash("success_msg", "User request has been accepted!");
    res.json({ success: true, message: "User request accepted successfully." });
  } catch (error) {
    console.error("Error accepting user:", error.message);
    req.flash("error_msg", "Server error while accepting user request.");
    res.status(500).json({ success: false, message: "An error occurred. Please try again." });
  }
};
