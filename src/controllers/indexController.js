const User = require("../models/user");
const Wallet = require("../models/wallet");
const Payments = require("../models/payments");
const PlanRequest = require("../models/planRequest");
const Repair = require("../models/repair");
const Inventory = require("../models/inventery");
const SoldItem = require("../models/Sold_Products");
const AddUser = require("../models/adduser");

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
      deliveredRepairs,
      subscription,       // ✅ FIXED: Now fetching subscription from PlanRequest
      matchedPackage,
      latestPayment,
      userPlan
    ] = await Promise.all([
      Repair.find({ user_id: userId }).sort({ _id: -1 }),
      Inventory.find({ user_id: userId }).sort({ _id: -1 }),
      Inventory.countDocuments({ user_id: userId }),
      SoldItem.countDocuments({ user_id: userId }),
      SoldItem.find({ user_id: userId }).sort({ sale_date: -1 }).limit(100), // Fetch recent sold items with sale dates
      Repair.countDocuments({ user_id: userId }),
      Repair.countDocuments({ status: 'Pending', user_id: userId }),
      Repair.countDocuments({ status: 'Completed', user_id: userId }),
      AddUser.find().select('name'),
      AddUser.countDocuments(),
      Repair.find({ status: 'Delivered' }).select('Price'),
      PlanRequest.findOne({ user: userId }).sort({ createdAt: -1 }), // ✅ Correct subscription
      Payments.findOne({ user: userId }).sort({ createdAt: -1 }),
      Payments.findOne({ user: userId }).sort({ createdAt: -1 }),
      Payments.findOne({ user: userId }).sort({ createdAt: -1 })
    ]);

    // Enhanced logging for plan debugging
    console.log(`🔍 Dashboard data fetched for user: ${user.email} (ID: ${userId})`);
    if (userPlan) {
      console.log(`📋 User plan found: ${userPlan.planName} (Status: ${userPlan.status})`);
      console.log(`📅 Plan expires: ${userPlan.expiryDate ? new Date(userPlan.expiryDate).toLocaleDateString() : 'No expiry date'}`);
    } else {
      console.log(`⚠️ No user plan found for user: ${user.email}`);

      // Auto-assign Free Trial plan if user has no plan
      console.log(`🔄 Attempting to assign Free Trial plan to user: ${user.email}`);
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

      const savedPlan = await freeTrialPlan.save();

      // Also update the User model
      await User.findByIdAndUpdate(userId, {
        plan_name: "Free Trial",
        plan_limit: 30
      });

      console.log(`✅ Free Trial plan auto-assigned to user: ${user.email} on dashboard access`);
      console.log(`💾 New plan saved with ID: ${savedPlan._id}`);

      // Refresh the userPlan data
      userPlan = savedPlan;
    }

    // Calculate comprehensive sales data
    const repairSales = deliveredRepairs.reduce((sum, repair) => sum + (repair.Price || 0), 0);
    const productSales = soldItems.reduce((sum, item) => sum + (parseFloat(item.Price) || 0), 0);
    const totalSales = repairSales + productSales;
    const totalRepairs = deliveredRepairs.length;

    // Calculate sales growth percentage (comparing with previous period)
    const currentPeriodSales = totalSales;
    const previousPeriodSales = currentPeriodSales * 0.85; // Mock previous period for now
    const salesGrowth = previousPeriodSales > 0 ? ((currentPeriodSales - previousPeriodSales) / previousPeriodSales) * 100 : 0;

    // Format total sales for display
    const formattedTotalSales = totalSales >= 1000 ? `${(totalSales / 1000).toFixed(1)}K` : totalSales.toFixed(0);

    const profileImagePath = user.user_img || "/uploads/default.png";

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
      teams,

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
