// Test Payment Controller - For Debugging Only
const User = require("../models/user");
const Payments = require("../models/payments");
const PlanRequest = require("../models/planRequest");
const Transaction = require("../models/transaction");

/**
 * Test payment activation manually
 * URL: /test-payment-activation?userId=USER_ID&plan=BASIC
 */
exports.testPaymentActivation = async (req, res) => {
  try {
    const { userId, plan } = req.query;

    if (!userId || !plan) {
      return res.json({
        success: false,
        message: "userId and plan required. Example: /test-payment-activation?userId=USER_ID&plan=BASIC"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    const startDate = new Date();
    const expiryDate = new Date(startDate);
    expiryDate.setDate(expiryDate.getDate() + 30);

    // 1. Create Payment record
    const payment = new Payments({
      user: userId,
      plan,
      amount: 1.00,
      gateway: 'test',
      status: 'active',
      transaction_id: `TEST-${Date.now()}`,
      startDate,
      expiryDate
    });
    await payment.save();

    // 2. Create PlanRequest
    const planRequest = new PlanRequest({
      user: userId,
      planName: plan,
      status: 'Active',
      invoiceStatus: 'Paid',
      startDate,
      expiryDate,
      amount: 1.00,
      description: `${plan} plan activated via TEST`
    });
    await planRequest.save();

    // 3. Update User
    await User.findByIdAndUpdate(userId, {
      plan_name: plan,
      payment_method: 'TEST',
      plan_status: 'Active',
      invoice_status: 'Paid',
      start_date: startDate,
      expiry_date: expiryDate
    });

    // 4. Create Transaction
    await Transaction.create({
      user: userId,
      type: 'plan_purchase',
      amount: 1.00,
      status: 'success',
      gateway: 'test',
      reference: `TEST-${Date.now()}`,
      description: `${plan} plan test activation`
    });

    res.json({
      success: true,
      message: "Payment activation test successful",
      data: {
        user: user.email,
        plan,
        status: 'Active',
        invoiceStatus: 'Paid',
        startDate,
        expiryDate,
        paymentId: payment._id,
        planRequestId: planRequest._id
      }
    });

  } catch (error) {
    res.json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
};

/**
 * Check payment status
 * URL: /check-payment-status?userId=USER_ID
 */
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.json({
        success: false,
        message: "userId required. Example: /check-payment-status?userId=USER_ID"
      });
    }

    const [user, payment, planRequest, transaction] = await Promise.all([
      User.findById(userId).select('email plan_name plan_status invoice_status start_date expiry_date'),
      Payments.findOne({ user: userId }).sort({ createdAt: -1 }),
      PlanRequest.findOne({ user: userId }).sort({ createdAt: -1 }),
      Transaction.findOne({ user: userId }).sort({ createdAt: -1 })
    ]);

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      data: {
        user: {
          email: user.email,
          plan_name: user.plan_name,
          plan_status: user.plan_status,
          invoice_status: user.invoice_status,
          start_date: user.start_date,
          expiry_date: user.expiry_date
        },
        latestPayment: payment ? {
          plan: payment.plan,
          status: payment.status,
          gateway: payment.gateway,
          amount: payment.amount,
          createdAt: payment.createdAt
        } : null,
        latestPlanRequest: planRequest ? {
          planName: planRequest.planName,
          status: planRequest.status,
          invoiceStatus: planRequest.invoiceStatus,
          startDate: planRequest.startDate,
          expiryDate: planRequest.expiryDate,
          createdAt: planRequest.createdAt
        } : null,
        latestTransaction: transaction ? {
          type: transaction.type,
          status: transaction.status,
          gateway: transaction.gateway,
          amount: transaction.amount,
          createdAt: transaction.createdAt
        } : null
      }
    });

  } catch (error) {
    res.json({
      success: false,
      message: error.message
    });
  }
};

module.exports = exports;
