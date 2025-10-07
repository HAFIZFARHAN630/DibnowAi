require("dotenv").config();
const crypto = require("crypto");
const axios = require("axios");

// Model imports with error handling
let User, PaymentSettings, Wallet, Transaction, Payments;

try {
  User = require("../models/user");
  PaymentSettings = require("../models/paymentSettings");
  Wallet = require("../models/wallet");
  Transaction = require("../models/transaction");
  Payments = require("../models/payments");

  console.log("✅ All models imported successfully");
} catch (modelError) {
  console.error("❌ Error importing models:", modelError.message);
  throw new Error("Failed to import required models: " + modelError.message);
}

/**
 * PayFast Payment Controller
 * Handles PayFast payment gateway integration including:
 * - Payment initiation
 * - Success/failure handling
 * - Webhook processing with signature verification
 * - Database updates and notifications
 */

// Middleware to ensure user is logged in
function ensureLoggedIn(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/sign_in");
  }
  next();
}

/**
 * Initiate PayFast payment
 * Creates payment form and redirects to PayFast gateway
 */
const initiatePaymentHandler = [
  ensureLoggedIn,
  async (req, res) => {
    try {
      const { plan, amount } = req.body;
      const userId = req.session.userId;

      // Validate required fields
      if (!plan || !amount) {
        console.error("PayFast: Missing plan or amount", { plan, amount });
        req.flash("error_msg", "Plan and amount are required for PayFast payment.");
        return res.redirect("/pricing");
      }

      // Define plan prices for validation
      const planPrices = {
        FREE_TRIAL: "0.00",
        BASIC: "20.88",
        STANDARD: "35.88",
        PREMIUM: "55.88",
      };

      // Validate plan
      if (!planPrices[plan]) {
        console.error("PayFast: Invalid plan selected", { plan });
        req.flash("error_msg", "Invalid plan selected.");
        return res.redirect("/pricing");
      }

      const expectedAmount = parseFloat(planPrices[plan]);
      const submittedAmount = parseFloat(amount);

      // Validate amount
      if (submittedAmount < expectedAmount) {
        console.error("PayFast: Amount too low", { expectedAmount, submittedAmount });
        req.flash("error_msg",
          `Amount too low! Plan requires £${expectedAmount} but you entered £${submittedAmount}.`
        );
        return res.redirect("/pricing");
      }

      // Get PayFast settings from database or environment
      let payfastSettings = await PaymentSettings.findOne({ gateway: 'payfast' }).lean();

      if (!payfastSettings || !payfastSettings.enabled) {
        // Use environment variables as fallback
        if (process.env.PAYFAST_MERCHANT_ID && process.env.PAYFAST_MERCHANT_KEY) {
          payfastSettings = {
            mode: process.env.PAYFAST_MODE || 'live',
            credentials: {
              merchant_id: process.env.PAYFAST_MERCHANT_ID,
              merchant_key: process.env.PAYFAST_MERCHANT_KEY
            }
          };
        } else {
          console.error("PayFast: Gateway not configured. Checking environment variables...");
          console.error("PAYFAST_MERCHANT_ID exists:", !!process.env.PAYFAST_MERCHANT_ID);
          console.error("PAYFAST_MERCHANT_KEY exists:", !!process.env.PAYFAST_MERCHANT_KEY);
          console.error("PAYFAST_MERCHANT_ID value:", process.env.PAYFAST_MERCHANT_ID);
          req.flash("error_msg", "PayFast gateway not configured.");
          return res.redirect("/pricing");
        }
      }

      // Get user details for PayFast form
      const user = await User.findById(userId).select('first_name last_name email');
      if (!user) {
        console.error("PayFast: User not found", { userId });
        req.flash("error_msg", "User not found.");
        return res.redirect("/pricing");
      }

      // Create PayFast payment data
      const mPaymentId = `plan_${plan}_${Date.now()}_${userId}`;
      const payfastData = {
        merchant_id: payfastSettings.credentials.merchant_id,
        merchant_key: payfastSettings.credentials.merchant_key,
        return_url: `${process.env.APP_BASE_URL}/payfast/success`,
        cancel_url: `${process.env.APP_BASE_URL}/payfast/failure`,
        notify_url: `${process.env.APP_BASE_URL}/payfast-webhook`,
        name_first: user.first_name || 'Customer',
        name_last: user.last_name || 'Name',
        email_address: user.email || 'customer@example.com',
        m_payment_id: mPaymentId,
        amount: submittedAmount.toFixed(2),
        item_name: `${plan} Plan Subscription`,
        item_description: `Payment for ${plan} subscription plan via PayFast`,
        custom_int1: userId, // User ID
        custom_str1: plan,   // Plan name
        custom_str2: 'payfast' // Gateway
      };

      // Generate PayFast signature (without merchant_key in signature calculation)
      const signature = generatePayFastSignature(payfastData, payfastSettings.credentials.merchant_key);

      // Create pending payment record
      const startDate = new Date();
      const expiryDate = new Date(startDate);
      expiryDate.setDate(expiryDate.getDate() + 30);

      const newPayment = new Payments({
        user: userId,
        plan,
        amount: submittedAmount,
        gateway: 'payfast',
        startDate,
        expiryDate,
        status: 'pending'
      });

      await newPayment.save();
      console.log("PayFast: Pending payment record created", { paymentId: newPayment._id });

      // Create pending transaction record
      const newTransaction = new Transaction({
        user: userId,
        type: 'payment',
        amount: submittedAmount,
        status: 'success' // PayFast transactions start as success and get updated by webhook
      });
      await newTransaction.save();

      // Store payment ID in session for tracking
      req.session.pendingPayFastPayment = newPayment._id;

      // Render PayFast payment form
      const html = generatePayFastForm(payfastData, signature);

      console.log("PayFast: Payment initiated successfully", {
        userId,
        plan,
        amount: submittedAmount,
        paymentId: newPayment._id
      });

      res.send(html);

    } catch (error) {
      console.error("PayFast: Payment initiation error:", error.message);
      req.flash("error_msg", "Failed to initiate PayFast payment. Please try again.");
      res.redirect("/pricing");
    }
  },
];

/**
 * Handle PayFast payment success/failure
 * This handles redirects from PayFast after payment completion
 */
const handlePaymentResultHandler = [
  ensureLoggedIn,
  async (req, res) => {
    try {
      const userId = req.session.userId;
      const { m_payment_id, payment_status, amount_gross } = req.method === "POST" ? req.body : req.query;

      console.log("PayFast: Payment result received", {
        m_payment_id,
        payment_status,
        amount_gross,
        method: req.method
      });

      // Clear pending payment from session
      delete req.session.pendingPayFastPayment;

      if (payment_status === 'COMPLETE' || payment_status === 'success') {
        // Payment successful - update records
        await updatePaymentSuccess(userId, m_payment_id, parseFloat(amount_gross || 0));

        req.flash("success_msg", "Payment successful! Your subscription has been activated.");
        res.redirect("/index");
      } else {
        // Payment failed or cancelled
        await updatePaymentFailure(userId, m_payment_id);

        req.flash("error_msg", "Payment failed or was cancelled. Please try again.");
        res.redirect("/pricing");
      }

    } catch (error) {
      console.error("PayFast: Payment result handling error:", error.message);
      req.flash("error_msg", "Error processing payment result. Please contact support.");
      res.redirect("/pricing");
    }
  },
];

/**
 * PayFast webhook handler for payment notifications
 * Processes Instant Transaction Notifications (ITN) from PayFast
 */
exports.handleWebhook = async (req, res) => {
  try {
    console.log("PayFast: Webhook received", {
      body: req.body,
      method: req.method,
      headers: req.headers
    });

    const paymentData = req.body;

    // Verify PayFast signature for security
    if (!verifyPayFastSignature(paymentData)) {
      console.error("PayFast: Invalid webhook signature", {
        receivedSignature: paymentData.signature,
        ip: req.ip || req.connection.remoteAddress
      });
      return res.status(400).send("Invalid signature");
    }

    // Extract payment details
    const mPaymentId = paymentData.m_payment_id;
    const paymentStatus = paymentData.payment_status;
    const amountGross = parseFloat(paymentData.amount_gross);
    const userId = paymentData.custom_int1;

    if (!mPaymentId || !userId) {
      console.error("PayFast: Missing payment ID or user ID in webhook");
      return res.status(400).send("Missing payment data");
    }

    console.log("PayFast: Processing webhook", {
      mPaymentId,
      paymentStatus,
      amountGross,
      userId
    });

    if (paymentStatus === 'COMPLETE') {
      // Payment successful
      await updatePaymentSuccess(userId, mPaymentId, parseFloat(amountGross || 0));

      console.log("PayFast: Payment completed successfully", {
        userId,
        mPaymentId,
        amountGross
      });
    } else {
      // Payment failed or pending
      await updatePaymentFailure(userId, mPaymentId);

      console.log("PayFast: Payment not completed", {
        userId,
        mPaymentId,
        paymentStatus
      });
    }

    // Always respond with 200 OK to PayFast
    res.status(200).send("OK");

  } catch (error) {
    console.error("PayFast: Webhook processing error:", error.message);
    res.status(500).send("Internal server error");
  }
};

/**
 * Generate PayFast signature for payment verification
 * @param {Object} data - Payment data object
 * @param {string} merchantKey - PayFast merchant key
 * @returns {string} - Generated signature
 */
function generatePayFastSignature(data, merchantKey) {
  try {
    // Create signature string (excluding merchant_key and signature fields)
    const signatureString = Object.keys(data)
      .filter(key => key !== 'merchant_key' && key !== 'signature' && data[key] !== '' && data[key] !== undefined)
      .sort()
      .map(key => `${key}=${encodeURIComponent(data[key]).replace(/%20/g, '+')}`)
      .join('&');

    // Generate MD5 signature with merchant key
    const signatureData = signatureString + '&merchant_key=' + merchantKey;
    console.log("PayFast: Signature data:", signatureData.substring(0, 100) + "...");

    return crypto.createHash('md5')
      .update(signatureData)
      .digest('hex');
  } catch (error) {
    console.error("PayFast: Signature generation error:", error.message);
    throw new Error("Failed to generate payment signature");
  }
}

/**
 * Verify PayFast webhook signature
 * @param {Object} paymentData - Webhook data from PayFast
 * @returns {boolean} - True if signature is valid
 */
function verifyPayFastSignature(paymentData) {
  try {
    // Remove signature from data for verification
    const { signature, ...dataWithoutSignature } = paymentData;

    if (!signature) {
      console.error("PayFast: No signature provided for verification");
      return false;
    }

    // Get merchant key from environment
    const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
    if (!merchantKey) {
      console.error("PayFast: Merchant key not configured");
      return false;
    }

    // Generate expected signature
    const expectedSignature = generatePayFastSignature(dataWithoutSignature, merchantKey);

    const isValid = signature === expectedSignature;
    if (!isValid) {
      console.error("PayFast: Signature verification failed", {
        received: signature,
        expected: expectedSignature
      });
    }

    return isValid;
  } catch (error) {
    console.error("PayFast: Signature verification error:", error.message);
    return false;
  }
}

/**
 * Update payment records on successful payment
 * @param {string} userId - User ID
 * @param {string} mPaymentId - PayFast payment ID
 * @param {number} amount - Payment amount
 */
async function updatePaymentSuccess(userId, mPaymentId, amount) {
  try {
    // Parse payment details from m_payment_id
    const paymentIdParts = mPaymentId.split('_');
    if (paymentIdParts.length < 4 || paymentIdParts[0] !== 'plan') {
      throw new Error("Invalid payment ID format");
    }

    const plan = paymentIdParts[1];

    // Update payment record to active
    const payment = await Payments.findOne({
      user: userId,
      gateway: 'payfast',
      status: 'pending'
    }).sort({ createdAt: -1 });

    if (payment) {
      payment.status = 'active';
      await payment.save();
    }

    // Update user plan
    await User.findByIdAndUpdate(userId, { plan_name: plan });

    // Update plan limits
    await updateUserPlanLimits(userId, plan);

    // Update transaction status to success
    const transaction = await Transaction.findOne({
      user: userId,
      type: 'payment',
      status: 'success'
    }).sort({ createdAt: -1 });

    if (transaction) {
      transaction.status = 'success';
      await transaction.save();
    }

    // Send notification
    await sendPaymentNotification(req, userId, plan, amount, 'success');

    console.log("PayFast: Payment success updated", {
      userId,
      plan,
      amount,
      paymentId: payment?._id
    });

  } catch (error) {
    console.error("PayFast: Error updating payment success:", error.message);
    throw error;
  }
}

/**
 * Update payment records on failed payment
 * @param {string} userId - User ID
 * @param {string} mPaymentId - PayFast payment ID
 */
async function updatePaymentFailure(userId, mPaymentId) {
  try {
    // Update payment record to failed
    const payment = await Payments.findOne({
      user: userId,
      gateway: 'payfast',
      status: 'pending'
    }).sort({ createdAt: -1 });

    if (payment) {
      payment.status = 'failed';
      await payment.save();
    }

    // Update transaction status to failed
    const transaction = await Transaction.findOne({
      user: userId,
      type: 'payment',
      status: 'success'
    }).sort({ createdAt: -1 });

    if (transaction) {
      transaction.status = 'failed';
      await transaction.save();
    }

    console.log("PayFast: Payment failure updated", {
      userId,
      mPaymentId,
      paymentId: payment?._id
    });

  } catch (error) {
    console.error("PayFast: Error updating payment failure:", error.message);
    throw error;
  }
}

/**
 * Update user plan limits based on selected plan
 * @param {string} userId - User ID
 * @param {string} plan - Plan name
 */
async function updateUserPlanLimits(userId, plan) {
  try {
    let planLimit;

    // Determine the plan limit based on the selected plan
    switch (plan) {
      case "BASIC":
        planLimit = 300;
        break;
      case "STANDARD":
        planLimit = 500;
        break;
      case "PREMIUM":
        planLimit = 1000;
        break;
      case "FREE_TRIAL":
      default:
        planLimit = 30;
        break;
    }

    // Get current plan limit
    const user = await User.findById(userId).select("plan_limit");
    if (!user) {
      throw new Error("User not found");
    }

    const currentPlanLimit = user.plan_limit || 0;
    const newPlanLimit = currentPlanLimit + planLimit;

    await User.findByIdAndUpdate(userId, { plan_limit: newPlanLimit });
    console.log(`PayFast: User plan limit updated to: ${newPlanLimit}`);
  } catch (error) {
    console.error("PayFast: Error updating plan limit:", error.message);
    throw error;
  }
}

/**
 * Send payment notification
 * @param {string} userId - User ID
 * @param {string} plan - Plan name
 * @param {number} amount - Payment amount
 * @param {string} status - Payment status
 */
async function sendPaymentNotification(req, userId, plan, amount, status) {
  try {
    // Create notification if notification service is available
    if (req && req.app && req.app.locals.notificationService) {
      const user = await User.findById(userId).select('first_name');
      if (user) {
        await req.app.locals.notificationService.createNotification(
          userId,
          user.first_name,
          `PayFast ${status === 'success' ? 'Payment Success' : 'Payment Failed'}`
        );
      }
    }
  } catch (error) {
    console.error("PayFast: Error sending notification:", error.message);
  }
}

/**
 * Generate PayFast payment form HTML
 * @param {Object} payfastData - Payment data
 * @param {string} signature - Generated signature
 * @returns {string} - HTML form
 */
function generatePayFastForm(payfastData, signature) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>PayFast Payment</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          text-align: center;
          padding: 50px;
          background-color: #f5f5f5;
        }
        .payment-container {
          max-width: 500px;
          margin: 0 auto;
          background: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .payment-details {
          margin: 20px 0;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 5px;
        }
        .btn {
          background: #ff6600;
          color: white;
          padding: 15px 30px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
        }
        .btn:hover {
          background: #e55a00;
        }
        .loading {
          text-align: center;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="payment-container">
        <h2>PayFast Payment Gateway</h2>
        <div class="payment-details">
          <p><strong>Plan:</strong> ${payfastData.custom_str1}</p>
          <p><strong>Amount:</strong> £${payfastData.amount}</p>
          <p><strong>Payment Method:</strong> PayFast</p>
        </div>
        <form action="${process.env.PAYFAST_HPP_URL}" method="post" name="payfast_form">
          ${Object.entries(payfastData)
            .filter(([key]) => key !== 'merchant_key') // Don't include merchant_key in form
            .map(([key, value]) => `<input type="hidden" name="${key}" value="${value}">`)
            .join('')}
          <input type="hidden" name="signature" value="${signature}">
          <button type="submit" class="btn">Proceed to PayFast Payment</button>
        </form>
        <div class="loading">
          <p>Redirecting to PayFast...</p>
        </div>
      </div>
      <script>
        // Auto-submit form after a short delay
        setTimeout(() => {
          document.payfast_form.submit();
        }, 2000);
      </script>
    </body>
    </html>
  `;
}

/**
 * Test PayFast API connectivity (for debugging live issues)
 */
exports.testPayFastConnection = async (req, res) => {
  try {
    console.log("🔧 Testing PayFast API connectivity...");

    const merchantId = process.env.PAYFAST_MERCHANT_ID;
    const securedKey = process.env.PAYFAST_SECURED_KEY || process.env.PAYFAST_MERCHANT_KEY;

    if (!merchantId || !securedKey) {
      return res.json({
        success: false,
        error: "PayFast credentials not configured",
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      });
    }

    // Test API endpoints
    const testResults = {
      credentials: {
        merchantId: merchantId,
        securedKey: securedKey ? `${securedKey.substring(0, 10)}...` : 'Not set'
      },
      endpoints: {},
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    };

    // Test token endpoint
    try {
      const tokenUrl = 'https://ipg1.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken';
      console.log("Testing token endpoint:", tokenUrl);

      const tokenResponse = await axios.get(tokenUrl, {
        timeout: 10000,
        headers: { "User-Agent": "Dibnow-Test/1.0" }
      });

      testResults.endpoints.tokenEndpoint = {
        status: tokenResponse.status,
        accessible: true,
        responseTime: Date.now()
      };
    } catch (tokenError) {
      testResults.endpoints.tokenEndpoint = {
        status: tokenError.response?.status || tokenError.code,
        accessible: false,
        error: tokenError.message,
        responseTime: Date.now()
      };
    }

    // Test payment portal endpoint
    try {
      const portalUrl = 'https://ipg2.apps.net.pk/Ecommerce/Pay';
      console.log("Testing portal endpoint:", portalUrl);

      const portalResponse = await axios.get(portalUrl, {
        timeout: 10000,
        headers: { "User-Agent": "Dibnow-Test/1.0" }
      });

      testResults.endpoints.portalEndpoint = {
        status: portalResponse.status,
        accessible: true,
        responseTime: Date.now()
      };
    } catch (portalError) {
      testResults.endpoints.portalEndpoint = {
        status: portalError.response?.status || portalError.code,
        accessible: false,
        error: portalError.message,
        responseTime: Date.now()
      };
    }

    res.json({
      success: true,
      testResults: testResults
    });

  } catch (error) {
    console.error("PayFast connection test error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Sample request data for testing PayFast payments
 * Use these examples to test the PayFast integration
 */
exports.getSampleTestData = () => {
  return {
    // Sample payment initiation request
    initiatePayment: {
      plan: "BASIC",
      amount: "20.88"
    },

    // Sample webhook data (for testing webhook handling)
    sampleWebhookData: {
      m_payment_id: "plan_BASIC_1699123456789_507f1f77bcf86cd799439011",
      payment_status: "COMPLETE",
      amount_gross: "20.88",
      signature: "calculated_signature_here",
      custom_int1: "507f1f77bcf86cd799439011",
      custom_str1: "BASIC"
    },

    // Environment variables required
    requiredEnvVars: [
      "PAYFAST_MERCHANT_ID",
      "PAYFAST_SECURED_KEY",
      "PAYFAST_API_URL",
      "PAYFAST_HPP_URL",
      "APP_BASE_URL"
    ],

    // Live environment debugging
    liveDebugging: {
      renderDeployment: "Make sure PAYFAST_SECURED_KEY is set (not PAYFAST_MERCHANT_KEY)",
      apiEndpoints: {
        token: "https://ipg1.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken",
        portal: "https://ipg2.apps.net.pk/Ecommerce/Pay"
      },
      testEndpoint: "/payfast/test-connection"
    }
  };
};

// Export middleware-wrapped functions for direct use
exports.initiatePayment = initiatePaymentHandler;
exports.handlePaymentResult = handlePaymentResultHandler;

// Export individual functions for internal use
exports.initiatePaymentHandler = initiatePaymentHandler[1];
exports.handlePaymentResultHandler = handlePaymentResultHandler[1];

/**
  * NEW TOKEN-BASED PAYFAST IMPLEMENTATION
  * Initiate PayFast payment using token-based approach
  */
exports.initiateTokenPayment = [
  ensureLoggedIn,
  async (req, res) => {
    try {
      console.log("🚀 ========== PAYFAST TOKEN PAYMENT START ==========");
      console.log("🔍 Request received at:", new Date().toISOString());
      console.log("🔍 Request method:", req.method);
      console.log("🔍 Request URL:", req.originalUrl);
      console.log("🔍 Request headers:", JSON.stringify(req.headers, null, 2));
      console.log("🔍 Request body:", JSON.stringify(req.body, null, 2));
      console.log("🔍 Session userId:", req.session.userId);
      console.log("🔍 Session data:", JSON.stringify(req.session, null, 2));

      const { plan, amount } = req.body;
      const userId = req.session.userId;

      console.log("📋 Parsed request data:", { plan, amount, userId });

      // Validate required fields
      console.log("🔍 Validating required fields...");
      console.log("🔍 Plan value:", plan, "Type:", typeof plan);
      console.log("🔍 Amount value:", amount, "Type:", typeof amount);

      if (!plan || !amount) {
        console.error("❌ PayFast Token: Missing plan or amount", { plan, amount });
        console.error("❌ Request body received:", JSON.stringify(req.body, null, 2));
        console.error("❌ Plan is empty:", !plan, "Amount is empty:", !amount);
        return res.status(400).json({
          success: false,
          message: "Plan and amount are required for PayFast payment.",
          debug: {
            receivedPlan: plan,
            receivedAmount: amount,
            planType: typeof plan,
            amountType: typeof amount,
            requestBody: req.body
          }
        });
      }
      console.log("✅ Required fields validation passed");

      // Define plan prices for validation
      const planPrices = {
        FREE_TRIAL: "0.00",
        BASIC: "20.88",
        STANDARD: "35.88",
        PREMIUM: "55.88",
      };

      // Validate plan
      if (!planPrices[plan]) {
        console.error("PayFast Token: Invalid plan selected", { plan });
        return res.status(400).json({
          success: false,
          message: "Invalid plan selected."
        });
      }

      const expectedAmount = parseFloat(planPrices[plan]);
      const submittedAmount = parseFloat(amount);

      // Validate amount
      if (submittedAmount < expectedAmount) {
        console.error("PayFast Token: Amount too low", { expectedAmount, submittedAmount });
        return res.status(400).json({
          success: false,
          message: `Amount too low! Plan requires £${expectedAmount} but you entered £${submittedAmount}.`
        });
      }

      // Get user details
      console.log("🔍 Fetching user details for userId:", userId);
      const user = await User.findById(userId).select('first_name last_name email');
      if (!user) {
        console.error("❌ PayFast Token: User not found", { userId });
        console.error("❌ Available users check:", await User.countDocuments());
        return res.status(404).json({
          success: false,
          message: "User not found.",
          debug: { userId, availableUsers: await User.countDocuments() }
        });
      }
      console.log("✅ User found:", { id: user._id, email: user.email, name: `${user.first_name} ${user.last_name}` });

      // Generate unique basket ID
      const basketId = `CART-NO-${Math.floor(Math.random() * Math.floor(100))}`;
      const transAmount = submittedAmount.toFixed(2);
      const orderDate = new Date().toISOString().slice(0, 10); // Format: 2020-05-25

      console.log("PayFast Token: Initiating payment", {
        userId,
        plan,
        amount: submittedAmount,
        basketId,
        transAmount,
        orderDate
      });

      // Get PayFast access token using the correct API endpoint
      console.log("🔍 Calling getPayFastAccessToken function...");
      const tokenData = await getPayFastAccessToken(basketId, transAmount);

      if (!tokenData.success) {
        console.error("❌ PayFast Token: Failed to get access token", tokenData.message);
        console.error("❌ Token data received:", JSON.stringify(tokenData, null, 2));
        return res.status(400).json({
          success: false,
          message: "Failed to get PayFast access token: " + tokenData.message,
          debug: { tokenData, basketId, transAmount }
        });
      }
      console.log("✅ Access token received successfully:", {
        tokenLength: tokenData.token.length,
        basketId: tokenData.basketId,
        amount: tokenData.amount
      });

      // Create pending payment record
      const startDate = new Date();
      const expiryDate = new Date(startDate);
      expiryDate.setDate(expiryDate.getDate() + 30);

      console.log("💾 Creating payment record in database...");
      const newPayment = new Payments({
        user: userId,
        plan,
        amount: submittedAmount,
        gateway: 'payfast_token',
        startDate,
        expiryDate,
        status: 'pending',
        transaction_id: basketId
      });

      await newPayment.save();
      console.log("✅ Payment record created successfully:", {
        paymentId: newPayment._id,
        userId: newPayment.user,
        plan: newPayment.plan,
        amount: newPayment.amount,
        gateway: newPayment.gateway,
        status: newPayment.status
      });

      // Create pending transaction record
      console.log("💾 Creating transaction record in database...");
      const newTransaction = new Transaction({
        user: userId,
        type: 'payment',
        amount: submittedAmount,
        status: 'pending',
        gateway: 'payfast_token',
        reference: basketId
      });
      await newTransaction.save();
      console.log("✅ Transaction record created successfully:", {
        transactionId: newTransaction._id,
        userId: newTransaction.user,
        amount: newTransaction.amount,
        gateway: newTransaction.gateway,
        status: newTransaction.status
      });

      // Store payment ID in session for tracking
      req.session.pendingPayFastPayment = newPayment._id;

      // Validate required data before generating form
      if (!tokenData.token || !basketId || !transAmount || !orderDate || !user) {
        console.error("PayFast Token: Missing required data for form generation", {
          hasToken: !!tokenData.token,
          basketId,
          transAmount,
          orderDate,
          hasUser: !!user
        });
        return res.status(400).json({
          success: false,
          message: "Missing required data to generate payment form"
        });
      }

      // Generate HTML form for PayFast payment (matches user's working example)
      const html = generatePayFastTokenForm(tokenData.token, basketId, transAmount, orderDate, user);

      console.log("PayFast Token: Payment initiated successfully", {
        userId,
        plan,
        amount: submittedAmount,
        basketId,
        token: tokenData.token.substring(0, 20) + "...",
        htmlLength: html.length,
        orderDate: orderDate,
        userEmail: user.email,
        merchantId: process.env.PAYFAST_MERCHANT_ID
      });

      // Set proper content type for HTML response
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

      // Log the complete response for debugging
      console.log("PayFast Token: Sending HTML response", {
        htmlPreview: html.substring(0, 200) + "...",
        contentType: 'text/html',
        responseLength: html.length
      });

      // Log the complete response for debugging
      console.log("PayFast Token: Sending HTML response", {
        htmlPreview: html.substring(0, 200) + "...",
        contentType: 'text/html',
        responseLength: html.length,
        basketId: basketId,
        token: tokenData.token.substring(0, 10) + "..."
      });

      // Set proper content type for HTML response
      console.log("🔍 Setting response headers...");
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

      console.log("📤 Sending HTML response...");
      console.log("📤 Response status:", res.statusCode);
      console.log("📤 Response headers:", JSON.stringify(res.getHeaders(), null, 2));

      // Log success and return HTML form
      console.log("✅ PayFast HTML form generated successfully");
      console.log("📋 Form details:", {
        action: "https://ipg2.apps.net.pk/Ecommerce/api/Transaction/PostTransaction",
        basketId: basketId,
        amount: transAmount,
        hasToken: !!tokenData.token,
        tokenLength: tokenData.token.length,
        token: tokenData.token.substring(0, 20) + "...",
        merchantId: process.env.PAYFAST_MERCHANT_ID
      });

      // Log the actual form data being sent to PayFast
      console.log("📋 Form fields being sent to PayFast:");
      console.log(`  - MERCHANT_ID: ${process.env.PAYFAST_MERCHANT_ID}`);
      console.log(`  - TOKEN: ${tokenData.token.substring(0, 20)}...`);
      console.log(`  - BASKET_ID: ${basketId}`);
      console.log(`  - TXNAMT: ${transAmount}`);
      console.log(`  - CURRENCY_CODE: GBP`);
      console.log(`  - SUCCESS_URL: ${process.env.APP_BASE_URL}/pricing/payfast/success`);
      console.log(`  - FAILURE_URL: ${process.env.APP_BASE_URL}/pricing/payfast/cancel`);

      // Return HTML form that will be rendered by the frontend
      res.send(html);

      console.log("✅ ========== PAYFAST TOKEN PAYMENT END (SUCCESS) ==========");

    } catch (error) {
      console.error("❌ ========== PAYFAST CRITICAL ERROR ==========");
      console.error("❌ Error message:", error.message);
      console.error("❌ Error code:", error.code);
      console.error("❌ Error stack:", error.stack);
      console.error("❌ Request details:", {
        method: req.method,
        url: req.url,
        body: req.body,
        userId: req.session.userId,
        headers: req.headers,
        session: req.session
      });

      // Check for specific error types
      if (error.code === 'MODULE_NOT_FOUND') {
        console.error("❌ Missing module dependency");
      } else if (error.message.includes('Cannot find module')) {
        console.error("❌ Module import error");
      } else if (error.message.includes('ECONNREFUSED')) {
        console.error("❌ Database connection refused");
      }

      res.status(500).json({
        success: false,
        message: "Internal server error occurred",
        error: error.message,
        code: error.code,
        stack: error.stack,
        requestId: Date.now(),
        timestamp: new Date().toISOString(),
        debug: {
          hasBody: !!req.body,
          hasUserId: !!req.session.userId,
          bodyKeys: req.body ? Object.keys(req.body) : []
        }
      });
    }
  },
];

/**
  * Get PayFast access token from ipg1
  */
async function getPayFastAccessToken(basketId, transAmount) {
  try {
    console.log("🔑 ========== TOKEN GENERATION START ==========");
    console.log("🔑 Input parameters:", { basketId, transAmount });

    const merchantId = process.env.PAYFAST_MERCHANT_ID;
    const securedKey = process.env.PAYFAST_SECURED_KEY || process.env.PAYFAST_MERCHANT_KEY;

    console.log("🔑 Environment check:", {
      merchantIdExists: !!merchantId,
      securedKeyExists: !!securedKey,
      merchantIdLength: merchantId?.length,
      securedKeyLength: securedKey?.length
    });

    if (!merchantId || !securedKey) {
      console.error("❌ PayFast credentials not configured");
      return {
        success: false,
        message: "PayFast credentials not configured",
        debug: { merchantId: !!merchantId, securedKey: !!securedKey }
      };
    }

    // Use the correct PayFast Pakistan API endpoint for live environment
    const tokenUrl = `https://ipg1.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken`;

    console.log("PayFast Token: Requesting access token", {
      merchantId,
      basketId,
      transAmount,
      tokenUrl: tokenUrl
    });

    // Send POST request with required parameters in form data
    console.log("🔑 Preparing API request...");
    const formData = new URLSearchParams();
    formData.append('MERCHANT_ID', merchantId);
    formData.append('SECURED_KEY', securedKey);
    formData.append('BASKET_ID', basketId);
    formData.append('TXNAMT', transAmount);
    formData.append('CURRENCY_CODE', 'GBP');

    // Try alternative parameter names that PayFast might expect
    console.log("🔑 Also trying alternative parameter formats...");
    const alternativeFormData = new URLSearchParams();
    alternativeFormData.append('MERCHANT_ID', merchantId);
    alternativeFormData.append('SECURED_KEY', securedKey);
    alternativeFormData.append('BASKET_ID', basketId);
    alternativeFormData.append('TXNAMT', transAmount);
    alternativeFormData.append('CURRENCY_CODE', 'GBP');

    console.log("🔑 Form data prepared:", {
      merchantId: merchantId,
      securedKey: securedKey ? securedKey.substring(0, 10) + "..." : "Not set",
      basketId: basketId,
      amount: transAmount,
      currency: 'GBP',
      formDataString: formData.toString()
    });

    console.log("🔑 Making API request to:", tokenUrl);
    console.log("🔑 Request headers:", {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Dibnow-PayFast/1.0"
    });
    console.log("🔑 Form data being sent:", formData.toString());

    const response = await axios.post(tokenUrl, formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Dibnow-PayFast/1.0",
        "Accept": "application/json"
      },
      timeout: 30000,
      maxRedirects: 5
    });

    console.log("🔑 API response received:", {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      dataKeys: Object.keys(response.data || {}),
      hasAccessToken: !!response.data?.ACCESS_TOKEN,
      fullResponseData: response.data
    });

    console.log("PayFast Token: Token response status", response.status);
    console.log("PayFast Token: Token response data", JSON.stringify(response.data, null, 2));

    const token = response.data?.ACCESS_TOKEN;

    if (!token) {
      console.error("❌ PayFast Token: No access token in response", {
        responseData: response.data,
        responseStatus: response.status,
        responseHeaders: response.headers
      });
      return {
        success: false,
        message: "No access token received from PayFast. Response: " + JSON.stringify(response.data, null, 2)
      };
    }

    console.log("✅ Token extracted successfully:", {
      tokenLength: token.length,
      token: token.substring(0, 20) + "...",
      basketId: basketId,
      amount: transAmount,
      fullToken: token
    });

    console.log("✅ ========== TOKEN GENERATION END (SUCCESS) ==========");

    return {
      success: true,
      token: token,
      basketId: basketId,
      amount: transAmount
    };

  } catch (error) {
    console.error("❌ ========== TOKEN GENERATION ERROR DETAILS ==========");
    console.error("❌ Error code:", error.code);
    console.error("❌ Error message:", error.message);
    console.error("❌ Error stack:", error.stack);

    if (error.code === 'ENOTFOUND') {
      console.error("❌ Network error - cannot reach PayFast servers");
      return {
        success: false,
        message: "Failed to get access token: Network error - cannot reach PayFast servers. Check internet connection.",
        debug: { errorCode: error.code, errorMessage: error.message }
      };
    }

    if (error.response) {
      console.error("❌ API Error Response Details:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      });

      return {
        success: false,
        message: `PayFast API error (${error.response.status}): ${error.response.data?.errorDescription || error.response.data?.message || error.message}`,
        debug: {
          status: error.response.status,
          data: error.response.data,
          errorCode: error.code
        }
      };
    }

    if (error.code === 'ECONNREFUSED') {
      console.error("❌ Connection refused - PayFast servers may be down");
      return {
        success: false,
        message: "Failed to get access token: Connection refused. PayFast servers may be down.",
        debug: { errorCode: error.code, errorMessage: error.message }
      };
    }

    console.error("❌ Unknown error occurred");
    return {
      success: false,
      message: `Failed to get access token: ${error.code || 'Unknown error'} - ${error.message}`,
      debug: {
        errorCode: error.code,
        errorMessage: error.message,
        stack: error.stack
      }
    };
  }
}

/**
 * Generate random string for basket ID
 */
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate PayFast token payment form HTML (matches user's working example)
 */
function generatePayFastTokenForm(token, basketId, transAmount, orderDate, user) {
  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const securedKey = process.env.PAYFAST_SECURED_KEY || process.env.PAYFAST_MERCHANT_KEY;

  return `<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/css/bootstrap.min.css" integrity="sha384-Vkoo8x4CGsO3+Hhxv8T/Q5PaXtkKtu6ug5TOeNV6gBiFeWPGFN9MuhOf23Q9Ifjh" crossorigin="anonymous">
    <title>PayFast WebCheckout Integration Demo</title>
</head>
<body>
    <div class="container">
        <h2>PayFast WebCheckout Integration Demo</h2>

        <div class="card">
            <div class="card-body">
                <div class="card-header">
                    PayFast Web Checkout - Token Based
                </div>
                <form method="post" action="https://ipg2.apps.net.pk/Ecommerce/api/Transaction/PostTransaction" id="payfastForm">
                    <div class="row">
                        <div class="col-lg-6">
                            <div class="form-group">
                                <label>Merchant ID</label>
                                <input class="form-control" type="text" name="MERCHANT_ID" value="${merchantId}">
                            </div>
                        </div>
                        <div class="col-lg-6">
                            <div class="form-group">
                                <label>Merchant Name</label>
                                <input class="form-control" type="text" name="MERCHANT_NAME" value="Dibnow">
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-lg-6">
                            <div class="form-group">
                                <label>Token</label>
                                <input class="form-control" type="text" name="TOKEN" value="${token}" data-toggle="tooltip" role="tooltip" title="Temporary Token">
                            </div>
                        </div>
                        <div class="col-lg-6">
                            <div class="form-group">
                                <label>Proccode</label>
                                <input readonly="readonly" class="form-control" type="text" name="PROCCODE" value="00">
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-lg-6">
                            <div class="form-group">
                                <label>Amount</label>
                                <input class="form-control" type="text" name="TXNAMT" value="${transAmount}">
                            </div>
                        </div>
                        <div class="col-lg-6">
                            <div class="form-group">
                                <label>Customer Mobile Number</label>
                                <input class="form-control" type="text" name="CUSTOMER_MOBILE_NO" value="+92300000000">
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-lg-6">
                            <div class="form-group">
                                <label>Customer Email</label>
                                <input class="form-control" type="text" name="CUSTOMER_EMAIL_ADDRESS" value="${user.email || 'email@example.com'}">
                            </div>
                        </div>
                        <div class="col-lg-6">
                            <div class="form-group">
                                <label>Signature</label>
                                <input class="form-control" type="text" name="SIGNATURE" value="RANDOMSTRINGVALUE">
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-lg-6">
                            <div class="form-group">
                                <label>Version</label>
                                <input class="form-control" type="text" name="VERSION" value="MY_VER_1.0">
                            </div>
                        </div>
                        <div class="col-lg-6">
                            <div class="form-group">
                                <label>Transaction Description</label>
                                <input class="form-control" type="text" name="TXNDESC" value="Dibnow Payment">
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-lg-6">
                            <div class="form-group">
                                <label>Success CallBack URL</label>
                                <input class="form-control" type="text" name="SUCCESS_URL" value="${process.env.APP_BASE_URL}/pricing/payfast/success">
                            </div>
                        </div>
                        <div class="col-lg-6">
                            <div class="form-group">
                                <label>Failure CallBack URL</label>
                                <input class="form-control" type="text" name="FAILURE_URL" value="${process.env.APP_BASE_URL}/pricing/payfast/cancel">
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-lg-6">
                            <div class="form-group">
                                <label>Basket ID/Order ID</label>
                                <input class="form-control" type="text" name="BASKET_ID" value="${basketId}">
                            </div>
                        </div>
                        <div class="col-lg-6">
                            <div class="form-group">
                                <label>Order Date</label>
                                <input class="form-control" type="text" name="ORDER_DATE" value="${orderDate}">
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Checkout URL</label>
                        <input class="form-control" type="text" name="CHECKOUT_URL" value="${process.env.APP_BASE_URL}/pricing/payfast/backend/confirm">
                    </div>
                    <div class="form-group">
                        <input class="btn btn-primary" type="submit" value="PAY NOW" onclick="console.log('PayFast form submitted');">
                    </div>

                    <!-- Auto-submit script -->
                    <script>
                        console.log('PayFast form loaded, auto-submitting in 1 second...');
                        setTimeout(() => {
                            console.log('Auto-submitting PayFast form...');
                            document.getElementById('payfastForm').submit();
                        }, 1000);
                    </script>
                </form>
            </div>
        </div>

        <script src="https://code.jquery.com/jquery-3.4.1.slim.min.js" integrity="sha384-J6qa4849blE2+poT4WnyKhv5vZF5SrPo0iEjwBvKU7imGFAV0wwj1yYfoRSJoZ+n" crossorigin="anonymous"></script>
        <script src="https://cdn.jsdelivr.net/npm/popper.js@1.16.0/dist/umd/popper.min.js" integrity="sha384-Q6E9RHvbIyZFJoft+2mJbHaEWldlvI9IOYy5n3zV9zzTtmI3UksdQRVvoxMfooAo" crossorigin="anonymous"></script>
        <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/js/bootstrap.min.js" integrity="sha384-wfSDF2E50Y2D1uUdj0O3uMBJnjuUD4Ih7YwaYd1iqfktj0Uod8GCExl3Og8ifwB6" crossorigin="anonymous"></script>
    </div>
</body>
</html>`;
}

module.exports = exports;