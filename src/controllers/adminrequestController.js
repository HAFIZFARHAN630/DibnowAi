const User = require("../models/user");
const Payments = require("../models/payments");
const PlanRequest = require("../models/planRequest");
const moment = require("moment");
exports.getPayments = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      console.error("User ID is missing in the session.");
      return res.redirect("/");
    }

    // Get the user data and role
    const user = await User.findById(userId);
    if (!user) {
      console.error("User not found.");
      return res.redirect("/");
    }

    const isAdmin = user.role === "admin";
    const isUser = user.role === "user";

    // Build query based on user role
    let paymentsQuery = {};
    if (!isAdmin) {
      paymentsQuery.user = userId;
    }

    // Get payments with user data using aggregation
    const payments = await Payments.aggregate([
      { $match: paymentsQuery },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      { $unwind: '$userDetails' },
      {
        $project: {
          _id: 1,
          user: 1,
          plan: 1,
          gateway: 1,
          amount: 1,
          createdAt: 1,
          expiryDate: 1,
          status: 1,
          startDate: 1,
          username: '$userDetails.first_name',
          user_phone: '$userDetails.phone_number',
          user_address: '$userDetails.address',
          // Set default values for fields that don't exist in the model
          discount: { $literal: 0 },
          remaining_amount: '$amount',
          package_status: '$status',
          invoice_status: '$status',
          home_collection: { $literal: 0 },
          collection_address: { $literal: '' },
          contact_number: { $literal: '' },
          preferred_time: { $literal: '' },
          special_instructions: { $literal: '' },
          payment_screenshot: { $literal: '' },
          custom_amount: '$amount'
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    // Get plan requests for admin view
    const planRequests = await PlanRequest.find({})
      .populate('user', 'first_name last_name email')
      .sort({ createdAt: -1 });

    // Get notifications count (last 2 days)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const totalNotifactions = await require("../models/notification").countDocuments({
      is_read: false,
      created_at: { $gte: twoDaysAgo }
    });

    const password_data = await require("../models/notification").find({
      is_read: false,
      created_at: { $gte: twoDaysAgo }
    }).sort({ created_at: -1 });

    const successMsg = req.flash("success");

    // Get profile image path
    const profileImagePath = user.user_img || "/img/dumi img.png";

    res.render("PlanRequest/request", {
      user,
      message: null,
      email: user.email,
      isAdmin,
      payments: payments || [],
      planRequests: planRequests || [],
      bg_result: [], // Not needed for MongoDB
      messages: {
        success: successMsg.length > 0 ? successMsg[0] : null,
      },
      totalNotifactions,
      password_data: password_data,
      isUser,
      profileImagePath,
    });
  } catch (error) {
    console.error("Database query error:", error);
    return res.status(500).send("Internal Server Error");
  }
};
exports.profile = async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      console.error("User ID is missing in the session.");
      return res.redirect("/");
    }

    console.log("User ID from session:", userId);

    const user = await User.findById(userId);
    if (!user) {
      console.error("User not found.");
      return res.redirect("/");
    }

    const isAdmin = user.role === "admin";
    const isUser = user.role === "user";

    // Get payments with user data using aggregation
    const paymentResults = await Payments.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      { $unwind: '$userDetails' },
      {
        $project: {
          _id: 1,
          user: 1,
          plan: 1,
          gateway: 1,
          amount: 1,
          createdAt: 1,
          expiryDate: 1,
          status: 1,
          startDate: 1,
          username: '$userDetails.first_name',
          user_phone: '$userDetails.phone_number',
          user_address: '$userDetails.address',
          // Set default values for fields that don't exist in the model
          discount: { $literal: 0 },
          remaining_amount: '$amount',
          package_status: '$status',
          invoice_status: '$status',
          home_collection: { $literal: 0 },
          collection_address: { $literal: '' },
          contact_number: { $literal: '' },
          preferred_time: { $literal: '' },
          special_instructions: { $literal: '' },
          custom_amount: '$amount',
          coin_balance: { $literal: 0 }
        }
      }
    ]);

    // Get notifications count (last 2 days)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const totalNotifactions = await require("../models/notification").countDocuments({
      is_read: false,
      created_at: { $gte: twoDaysAgo }
    });

    const password_data = await require("../models/notification").find({
      is_read: false,
      created_at: { $gte: twoDaysAgo }
    }).sort({ created_at: -1 });

    const successMsg = req.flash("success");

    // Get profile image path
    const profileImagePath = user.user_img || "/img/dumi img.png";

    res.render("Request/request", {
      user: user,
      message: null,
      email: user.email,
      isAdmin,
      payments: paymentResults,
      bg_result: [], // Not needed for MongoDB
      messages: {
        success: successMsg.length > 0 ? successMsg[0] : null,
      },
      totalNotifactions,
      password_data: password_data,
      isUser,
      profileImagePath,
    });
  } catch (error) {
    console.error("Database query error:", error);
    return res.status(500).send("Internal Server Error");
  }
};

exports.UpdateUser = async (req, res) => {
  try {
    const { userId, invoice_status, package_status, expiry } = req.body;

    if (!userId || !invoice_status || !package_status || !expiry) {
      return res.status(400).json({
        message: "User ID, Package, Invoice, and Expiry are required.",
      });
    }

    // Find the latest payment for the user and update it
    const payment = await Payments.findOneAndUpdate(
      { user: userId },
      {
        status: package_status,
        expiryDate: new Date(expiry)
      },
      { sort: { createdAt: -1 }, new: true }
    );

    if (!payment) {
      return res.status(404).json({ message: "Payment record not found." });
    }

    req.flash("success", "Payment record updated successfully!");
    res.redirect("/request");
  } catch (error) {
    console.error("❌ Database update error:", error);
    return res.status(500).json({ message: "Database update failed." });
  }
};




exports.updatePlan = async (req, res) => {
  try {
    const user_id = req.body.user_id;
    const invoice_status = req.body.invoice_status?.toLowerCase();
    const package_status = req.body.package_status?.toLowerCase();
    const expiry = req.body.expiry;

    // ✅ Only lowercase values are allowed
    const validInvoiceStatuses = ["paid", "unpaid"];
    const validPackageStatuses = ["active", "pending", "expired"];

    // Validation checks
    if (!user_id || !invoice_status || !package_status || !expiry) {
      return res.status(400).json({
        message: "User ID, Invoice Status, Package Status, and Expiry are required.",
      });
    }

    if (!validInvoiceStatuses.includes(invoice_status)) {
      return res.status(400).json({
        message: "Invalid invoice status. Valid options are 'paid' or 'unpaid'.",
      });
    }

    if (!validPackageStatuses.includes(package_status)) {
      return res.status(400).json({
        message: "Invalid package status. Valid options are 'active', 'pending', or 'expired'.",
      });
    }

    console.log("🟡 Admin UpdatePlan Request:", {
      user_id,
      invoice_status,
      package_status,
      expiry,
    });

    // Find the latest payment for the user and update it
    const payment = await Payments.findOneAndUpdate(
      { user: user_id },
      {
        status: package_status,
        expiryDate: new Date(expiry)
      },
      { sort: { createdAt: -1 }, new: true }
    );

    if (!payment) {
      console.warn("⚠️ No matching record found for user_id:", user_id);
      return res.status(404).json({ message: "No matching payment record found." });
    }

    req.flash("success", "Plan updated successfully.");
    return res.redirect("/request");
  } catch (error) {
    console.error("❌ Database error in updatePlan:", error);
    return res.status(500).json({ message: "Failed to update plan." });
  }
};











exports.DeleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const result = await Payments.findByIdAndDelete(userId);

    if (!result) {
      console.error("Payment not found:", userId);
      return res.status(404).send("Payment not found");
    }

    req.flash("success", "User deleted successfully!");
    res.redirect("/request");
  } catch (error) {
    console.error("Database query error:", error);
    return res.status(500).send("Internal Server Error");
  }
};

exports.sendRespit = async (req, res) => {
  try {
    const { user_id, username, transaction_id, amount, package_name, coins, custom_amount, remaining_amount, Accepted } = req.body;

    // Since we don't have respits and daily_tasks models, we'll just log the action
    // and redirect successfully. You can create these models later if needed.

    console.log('Respit sent:', {
      user_id,
      username,
      transaction_id,
      amount,
      package_name,
      coins,
      custom_amount,
      remaining_amount,
      Accepted
    });

    // For now, we'll just redirect successfully
    // TODO: Create respits model and daily_tasks model if needed
    req.flash("success", "Receipt sent successfully!");
    res.redirect('/request');
  } catch (error) {
    console.error('Error sending respit:', error);
    return res.status(500).send('Server error');
  }
};

// Update Plan Request Status
exports.updatePlanRequest = async (req, res) => {
  try {
    const { planRequestId, status, invoiceStatus, expiryDate } = req.body;

    if (!planRequestId || !status) {
      return res.status(400).json({
        message: "Plan Request ID and Status are required.",
      });
    }

    // Get the plan request details before updating
    const planRequest = await PlanRequest.findById(planRequestId);
    if (!planRequest) {
      return res.status(404).json({ message: "Plan Request not found." });
    }

    const updateData = { status };
    if (invoiceStatus) updateData.invoiceStatus = invoiceStatus;
    if (expiryDate) updateData.expiryDate = new Date(expiryDate);

    // Update the plan request
    const updatedPlanRequest = await PlanRequest.findByIdAndUpdate(
      planRequestId,
      updateData,
      { new: true }
    );

    // If status is being set to 'Active' and invoice is 'Paid', activate the user's plan
    if (status === 'Active' && invoiceStatus === 'Paid' && planRequest.status !== 'Active') {
      try {
        // Create a Payments record for the activated plan
        const newPayment = new Payments({
          user: planRequest.user,
          plan: planRequest.planName,
          amount: planRequest.amount,
          gateway: 'manual',
          startDate: new Date(),
          expiryDate: expiryDate ? new Date(expiryDate) : planRequest.expiryDate,
          status: 'active'
        });

        await newPayment.save();

        // Update user's plan
        await User.findByIdAndUpdate(planRequest.user, {
          plan_name: planRequest.planName
        });

        // Update plan limits
        let planLimit;
        switch (planRequest.planName) {
          case "BASIC":
            planLimit = 300;
            break;
          case "STANDARD":
            planLimit = 500;
            break;
          case "PREMIUM":
            planLimit = 1000;
            break;
          default:
            planLimit = 30;
            break;
        }

        const user = await User.findById(planRequest.user).select("plan_limit");
        if (user) {
          const currentPlanLimit = user.plan_limit || 0;
          const newPlanLimit = currentPlanLimit + planLimit;
          await User.findByIdAndUpdate(planRequest.user, { plan_limit: newPlanLimit });
        }

        // Create transaction record
        const Transaction = require("../models/transaction");
        const newTransaction = new Transaction({
          user: planRequest.user,
          type: 'payment',
          amount: planRequest.amount,
          status: 'success'
        });
        await newTransaction.save();

        console.log(`✅ Plan activated for user ${planRequest.user} - Plan: ${planRequest.planName}`);
      } catch (activationError) {
        console.error("❌ Error activating plan:", activationError);
        // Don't fail the entire request if plan activation fails
      }
    }

    req.flash("success", "Plan request updated successfully!");
    res.redirect('/package-request');
  } catch (error) {
    console.error("❌ Database error in updatePlanRequest:", error);
    return res.status(500).json({ message: "Failed to update plan request." });
  }
};

// Delete Plan Request
exports.deletePlanRequest = async (req, res) => {
  try {
    const planRequestId = req.params.id;
    const result = await PlanRequest.findByIdAndDelete(planRequestId);

    if (!result) {
      console.error("Plan Request not found:", planRequestId);
      return res.status(404).send("Plan Request not found");
    }

    req.flash("success", "Plan request deleted successfully!");
    res.redirect('/package-request');
  } catch (error) {
    console.error("Database error:", error);
    return res.status(500).send("Internal Server Error");
  }
};

// Get Package Requests - renders Request/request.ejs
exports.getPackageRequests = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      console.error("User ID is missing in the session.");
      return res.redirect("/");
    }

    // Get the user data and role
    const user = await User.findById(userId);
    if (!user) {
      console.error("User not found.");
      return res.redirect("/");
    }

    const isAdmin = user.role === "admin";
    const isUser = user.role === "user";

    // Build query based on user role
    let paymentsQuery = {};
    if (!isAdmin) {
      paymentsQuery.user = userId;
    }

    // Get payments with user data using aggregation
    const payments = await Payments.aggregate([
      { $match: paymentsQuery },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      { $unwind: '$userDetails' },
      {
        $project: {
          _id: 1,
          user: 1,
          plan: 1,
          gateway: 1,
          amount: 1,
          createdAt: 1,
          expiryDate: 1,
          status: 1,
          startDate: 1,
          username: '$userDetails.first_name',
          user_phone: '$userDetails.phone_number',
          user_address: '$userDetails.address',
          // Set default values for fields that don't exist in the model
          discount: { $literal: 0 },
          remaining_amount: '$amount',
          package_status: '$status',
          invoice_status: '$status',
          home_collection: { $literal: 0 },
          collection_address: { $literal: '' },
          contact_number: { $literal: '' },
          preferred_time: { $literal: '' },
          special_instructions: { $literal: '' },
          payment_screenshot: { $literal: '' },
          custom_amount: '$amount'
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    // Get plan requests for admin view
    const planRequests = await PlanRequest.find({})
      .populate('user', 'first_name last_name email')
      .sort({ createdAt: -1 });

    // Get notifications count (last 2 days)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const totalNotifactions = await require("../models/notification").countDocuments({
      is_read: false,
      created_at: { $gte: twoDaysAgo }
    });

    const password_data = await require("../models/notification").find({
      is_read: false,
      created_at: { $gte: twoDaysAgo }
    }).sort({ created_at: -1 });

    const successMsg = req.flash("success");

    // Get profile image path
    const profileImagePath = user.user_img || "/img/dumi img.png";

    res.render("PlanRequest/request", {
      user,
      message: null,
      isAdmin,
      email: user.email,
      payments: payments || [],
      planRequests: planRequests || [],
      bg_result: [], // Not needed for MongoDB
      messages: {
        success: successMsg.length > 0 ? successMsg[0] : null,
      },
      totalNotifactions,
      password_data: password_data,
      isUser,
      profileImagePath,
    });
  } catch (error) {
    console.error("Database query error:", error);
    return res.status(500).send("Internal Server Error");
  }
};


