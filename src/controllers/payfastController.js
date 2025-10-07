require("dotenv").config();
const crypto = require("crypto");
const axios = require("axios");
const User = require("../models/user");
const PaymentSettings = require("../models/paymentSettings");
const Wallet = require("../models/wallet");
const Transaction = require("../models/transaction");
const Payments = require("../models/payments");

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
      "APP_BASE_URL"
    ]
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
      const { plan, amount } = req.body;
      const userId = req.session.userId;

      // Validate required fields
      if (!plan || !amount) {
        console.error("PayFast Token: Missing plan or amount", { plan, amount });
        return res.status(400).json({
          success: false,
          message: "Plan and amount are required for PayFast payment."
        });
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
      const user = await User.findById(userId).select('first_name last_name email');
      if (!user) {
        console.error("PayFast Token: User not found", { userId });
        return res.status(404).json({
          success: false,
          message: "User not found."
        });
      }

      // Generate unique basket ID
      const basketId = `ITEM-${generateRandomString(4)}`;
      const currencyCode = "GBP";
      const transAmount = submittedAmount.toFixed(2);
      const orderDate = new Date().toISOString().slice(0, 19).replace("T", " ");

      console.log("PayFast Token: Initiating payment", {
        userId,
        plan,
        amount: submittedAmount,
        basketId,
        currencyCode,
        transAmount
      });

      // Get PayFast access token from ipg1
      const tokenData = await getPayFastAccessToken(basketId, transAmount, currencyCode);

      if (!tokenData.success) {
        console.error("PayFast Token: Failed to get access token", tokenData.message);
        return res.status(400).json({
          success: false,
          message: "Failed to get PayFast access token: " + tokenData.message
        });
      }

      // Create pending payment record
      const startDate = new Date();
      const expiryDate = new Date(startDate);
      expiryDate.setDate(expiryDate.getDate() + 30);

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
      console.log("PayFast Token: Pending payment record created", { paymentId: newPayment._id });

      // Create pending transaction record
      const newTransaction = new Transaction({
        user: userId,
        type: 'payment',
        amount: submittedAmount,
        status: 'pending',
        gateway: 'payfast_token',
        reference: basketId
      });
      await newTransaction.save();

      // Store payment ID in session for tracking
      req.session.pendingPayFastPayment = newPayment._id;

      // Build the complete PayFast redirect URL for direct browser redirect
      // Use the correct PayFast IPG2 payment endpoint
      const baseUrl = 'https://ipg2.apps.net.pk/Ecommerce/Pay';

      const payfastParams = new URLSearchParams();
      payfastParams.append('MERCHANT_ID', process.env.PAYFAST_MERCHANT_ID);
      payfastParams.append('TOKEN', tokenData.token);
      payfastParams.append('BASKET_ID', basketId);
      payfastParams.append('TXNAMT', transAmount);
      payfastParams.append('CURRENCY_CODE', currencyCode);
      payfastParams.append('SUCCESS_URL', `${process.env.APP_BASE_URL}/pricing/payfast/success`);
      payfastParams.append('FAILURE_URL', `${process.env.APP_BASE_URL}/pricing/payfast/cancel`);
      payfastParams.append('ORDER_DATE', orderDate);

      const redirectUrl = `${baseUrl}?${payfastParams.toString()}`;

      console.log("PayFast Token: Payment initiated successfully", {
        userId,
        plan,
        amount: submittedAmount,
        basketId,
        token: tokenData.token.substring(0, 20) + "...",
        redirectUrl: redirectUrl.substring(0, 100) + "..."
      });

      // Return redirect URL for frontend to handle
      res.json({
        success: true,
        redirectUrl: redirectUrl,
        message: "Redirect to PayFast payment portal"
      });

    } catch (error) {
      console.error("PayFast Token: Payment initiation error:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to initiate PayFast payment. Please try again."
      });
    }
  },
];

/**
 * Get PayFast access token from ipg1
 */
async function getPayFastAccessToken(basketId, transAmount, currencyCode) {
  try {
    const merchantId = process.env.PAYFAST_MERCHANT_ID;
    const securedKey = process.env.PAYFAST_SECURED_KEY || process.env.PAYFAST_MERCHANT_KEY;

    if (!merchantId || !securedKey) {
      return {
        success: false,
        message: "PayFast credentials not configured"
      };
    }

    const tokenApiUrl = `${process.env.PAYFAST_API_URL}/GetAccessToken`;

    console.log("PayFast Token: Requesting access token", {
      merchantId,
      basketId,
      transAmount,
      currencyCode,
      tokenUrl: tokenApiUrl
    });

    const response = await axios.post(
      tokenApiUrl,
      {
        MERCHANT_ID: merchantId,
        SECURED_KEY: securedKey,
        BASKET_ID: basketId,
        TXNAMT: transAmount,
        CURRENCY_CODE: currencyCode,
      },
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 30000
      }
    );

    console.log("PayFast Token: Token response status", response.status);
    console.log("PayFast Token: Token response data", response.data);

    const token = response.data?.ACCESS_TOKEN || response.data?.access_token;

    if (!token) {
      console.error("PayFast Token: No access token in response", response.data);
      return {
        success: false,
        message: "No access token received from PayFast"
      };
    }

    return {
      success: true,
      token: token,
      basketId: basketId,
      amount: transAmount,
      currency: currencyCode
    };

  } catch (error) {
    console.error("PayFast Token: Error getting access token:", error.message);

    if (error.response) {
      console.error("PayFast Token: API Error Response:", {
        status: error.response.status,
        data: error.response.data
      });
    }

    return {
      success: false,
      message: `Failed to get access token: ${error.message}`
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

module.exports = exports;