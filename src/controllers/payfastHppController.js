require("dotenv").config();
const crypto = require("crypto");
const User = require("../models/user");
const PaymentSettings = require("../models/paymentSettings");
const Transaction = require("../models/transaction");

/**
 * PayFast Hosted Payment Page (HPP) Controller
 *
 * This controller implements PayFast's Hosted Payment Page integration:
 * - Generates payment URL for frontend redirection to PayFast
 * - Handles IPN (Instant Payment Notification) for payment status updates
 * - Processes return/cancel URLs after payment completion
 * - Verifies PayFast signatures for security
 *
 * Flow:
 * 1. Frontend calls initiatePayment → gets redirectUrl
 * 2. Frontend redirects user to PayFast HPP
 * 3. User completes payment on PayFast
 * 4. PayFast sends IPN to backend for verification
 * 5. PayFast redirects user back to success/cancel URL
 */

// Middleware to ensure user is logged in
function ensureLoggedIn(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: "User not logged in" });
  }
  next();
}

/**
 * Initiate PayFast payment and return redirect URL
 * POST /pricing/payfast/initiate
 *
 * Request body:
 * {
 *   "amount": 20.88,
 *   "item_name": "BASIC Plan Subscription",
 *   "custom_ref": "optional_custom_reference"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "redirectUrl": "https://www.payfast.co.za/eng/process?...",
 *   "m_payment_id": "unique_payment_reference"
 * }
 */
exports.initiatePayment = [
  ensureLoggedIn,
  async (req, res) => {
    try {
      const { amount, item_name, custom_ref } = req.body;
      const userId = req.session.userId;

      // Validate required fields
      if (!item_name) {
        console.error("PayFast HPP: Missing item_name", { item_name });
        return res.status(400).json({
          success: false,
          message: "Plan name is required"
        });
      }

      // If amount is empty, get it from plan name
      let paymentAmount;
      if (!amount || amount === '') {
        // Define plan prices mapping
        const planPrices = {
          'FREE': 0.00,
          'FREE TRIAL': 0.00,
          'BASIC': 20.88,
          'STANDARD': 35.88,
          'PREMIUM': 55.88
        };

        paymentAmount = planPrices[item_name.replace(' Plan Subscription', '')];
        if (paymentAmount === undefined) {
          console.error("PayFast HPP: Invalid plan name for amount lookup", { item_name });
          return res.status(400).json({
            success: false,
            message: "Invalid plan selected"
          });
        }

        console.log("PayFast HPP: Auto-filled amount from plan name", {
          plan: item_name,
          amount: paymentAmount
        });
      } else {
        paymentAmount = parseFloat(amount);
      }

      // Validate payment amount is valid
      if (paymentAmount <= 0 && !item_name.includes('FREE')) {
        console.error("PayFast HPP: Invalid payment amount", { amount: paymentAmount, item_name });
        return res.status(400).json({
          success: false,
          message: "Valid payment amount is required"
        });
      }

      // Get user details
      const user = await User.findById(userId).select('first_name last_name email');
      if (!user) {
        console.error("PayFast HPP: User not found", { userId });
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      // Generate unique payment reference
      const mPaymentId = `hpp_${Date.now()}_${userId}_${Math.random().toString(36).substr(2, 9)}`;

      // Create pending transaction record
      const newTransaction = new Transaction({
        user: userId,
        type: 'payment',
        amount: paymentAmount,
        status: 'pending',
        gateway: 'payfast_hpp',
        description: `PayFast HPP: ${item_name}`,
        reference: mPaymentId
      });

      await newTransaction.save();
      console.log("PayFast HPP: Pending transaction created", {
        transactionId: newTransaction._id,
        mPaymentId,
        amount: paymentAmount
      });

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
          console.error("PayFast HPP: Gateway not configured", {
            merchantIdExists: !!process.env.PAYFAST_MERCHANT_ID,
            merchantKeyExists: !!process.env.PAYFAST_MERCHANT_KEY,
            merchantIdLength: process.env.PAYFAST_MERCHANT_ID?.length || 0,
            merchantKeyLength: process.env.PAYFAST_MERCHANT_KEY?.length || 0
          });
          return res.status(400).json({
            success: false,
            message: "PayFast gateway not configured. Please check PAYFAST_MERCHANT_ID and PAYFAST_MERCHANT_KEY in environment variables."
          });
        }
      }

      // Create PayFast payment data
      const payfastData = {
        merchant_id: payfastSettings.credentials.merchant_id,
        merchant_key: payfastSettings.credentials.merchant_key,
        return_url: `${process.env.APP_BASE_URL}/pricing/payfast/success`,
        cancel_url: `${process.env.APP_BASE_URL}/pricing/payfast/cancel`,
        notify_url: `${process.env.APP_BASE_URL}/pricing/payfast/ipn`,
        name_first: user.first_name || 'Customer',
        name_last: user.last_name || 'User',
        email_address: user.email || 'customer@example.com',
        m_payment_id: mPaymentId,
        amount: paymentAmount.toFixed(2),
        item_name: item_name,
        item_description: `Payment for ${item_name} via PayFast Hosted Payment Page`,
        custom_int1: userId, // User ID for reference
        custom_str1: custom_ref || 'hpp_payment', // Custom reference
        custom_str2: 'payfast_hpp' // Gateway identifier
      };

      // Generate PayFast signature
      const signature = generatePayFastSignature(payfastData);

      // Build PayFast HPP URL for production (use the correct PayFast HPP URL)
      const baseUrl = process.env.PAYFAST_HPP_URL || 'https://ipg2.apps.net.pk';

      const payfastParams = new URLSearchParams();
      Object.keys(payfastData).forEach(key => {
        if (payfastData[key] !== undefined && payfastData[key] !== '') {
          payfastParams.append(key, payfastData[key]);
        }
      });
      payfastParams.append('signature', signature);

      const redirectUrl = `${baseUrl}?${payfastParams.toString()}`;

      console.log("PayFast HPP: Payment initiated successfully", {
        userId,
        mPaymentId,
        amount: paymentAmount,
        itemName: item_name,
        plan: item_name.replace(' Plan Subscription', ''), // Extract plan from item_name
        redirectUrl: redirectUrl.substring(0, 100) + '...' // Log partial URL for security
      });

      // Return redirect URL for frontend redirection
      res.json({
        success: true,
        redirectUrl: redirectUrl,
        m_payment_id: mPaymentId,
        amount: paymentAmount,
        item_name: item_name,
        message: "Redirect user to PayFast Hosted Payment Page"
      });

    } catch (error) {
      console.error("PayFast HPP: Payment initiation error:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to initiate PayFast payment. Please try again."
      });
    }
  },
];

/**
 * Handle PayFast IPN (Instant Payment Notification)
 * POST /pricing/payfast/ipn
 *
 * This endpoint receives payment notifications from PayFast
 * and updates transaction status accordingly
 */
exports.handleIPN = async (req, res) => {
  try {
    console.log("PayFast HPP: IPN received", {
      body: req.body,
      method: req.method,
      headers: req.headers
    });

    const ipnData = req.body;

    // Verify PayFast signature for security
    if (!verifyPayFastSignature(ipnData)) {
      console.error("PayFast HPP: Invalid IPN signature", {
        receivedSignature: ipnData.signature,
        ip: req.ip || req.connection.remoteAddress
      });
      return res.status(400).send("Invalid signature");
    }

    // Extract payment details
    const mPaymentId = ipnData.m_payment_id;
    const paymentStatus = ipnData.payment_status;
    const amountGross = parseFloat(ipnData.amount_gross || ipnData.amount);
    const userId = ipnData.custom_int1;

    if (!mPaymentId || !userId) {
      console.error("PayFast HPP: Missing payment ID or user ID in IPN");
      return res.status(400).send("Missing payment data");
    }

    console.log("PayFast HPP: Processing IPN", {
      mPaymentId,
      paymentStatus,
      amountGross,
      userId
    });

    // Find and update transaction based on payment status
    const transaction = await Transaction.findOne({
      reference: mPaymentId,
      user: userId,
      gateway: 'payfast_hpp'
    });

    if (!transaction) {
      console.error("PayFast HPP: Transaction not found", { mPaymentId, userId });
      return res.status(404).send("Transaction not found");
    }

    // Update transaction status based on PayFast payment status
    let newStatus = 'pending';
    switch (paymentStatus) {
      case 'COMPLETE':
        newStatus = 'success';
        break;
      case 'FAILED':
      case 'CANCELLED':
        newStatus = 'failed';
        break;
      case 'PENDING':
      default:
        newStatus = 'pending';
        break;
    }

    // Update transaction if status has changed
    if (transaction.status !== newStatus) {
      transaction.status = newStatus;
      transaction.gateway_response = ipnData;
      await transaction.save();

      console.log("PayFast HPP: Transaction status updated", {
        transactionId: transaction._id,
        oldStatus: transaction.status,
        newStatus: newStatus,
        amountGross
      });

      // Send notification for successful payments
      if (newStatus === 'success') {
        await sendPaymentNotification(req, userId, amountGross, 'success');
      }
    }

    // Always respond with 200 OK to PayFast
    res.status(200).send("OK");

  } catch (error) {
    console.error("PayFast HPP: IPN processing error:", error.message);
    res.status(500).send("Internal server error");
  }
};

/**
 * Handle successful payment return
 * GET /pricing/payfast/success
 *
 * Called when user returns from PayFast after successful payment
 */
exports.handleSuccess = [
  ensureLoggedIn,
  async (req, res) => {
    try {
      const userId = req.session.userId;
      const { m_payment_id, amount_gross } = req.query;

      console.log("PayFast HPP: Success return", {
        m_payment_id,
        amount_gross,
        userId
      });

      if (!m_payment_id) {
        req.flash("error_msg", "Payment reference missing");
        return res.redirect("/pricing");
      }

      // Find transaction
      const transaction = await Transaction.findOne({
        reference: m_payment_id,
        user: userId,
        gateway: 'payfast_hpp'
      });

      if (!transaction) {
        req.flash("error_msg", "Transaction not found");
        return res.redirect("/pricing");
      }

      // Check if payment was successful
      if (transaction.status === 'success') {
        req.flash("success_msg",
          `Payment successful! Amount: £${transaction.amount}. Transaction ID: ${transaction._id}`
        );
        res.redirect("/index");
      } else {
        req.flash("info_msg",
          "Payment is being processed. You will receive a notification once completed."
        );
        res.redirect("/pricing");
      }

    } catch (error) {
      console.error("PayFast HPP: Success handler error:", error.message);
      req.flash("error_msg", "Error processing payment success");
      res.redirect("/pricing");
    }
  },
];

/**
 * Handle cancelled/failed payment return
 * GET /pricing/payfast/cancel
 *
 * Called when user cancels payment or payment fails
 */
exports.handleCancel = [
  ensureLoggedIn,
  async (req, res) => {
    try {
      const userId = req.session.userId;
      const { m_payment_id } = req.query;

      console.log("PayFast HPP: Cancel return", {
        m_payment_id,
        userId
      });

      // Update transaction status to failed if found
      if (m_payment_id) {
        const transaction = await Transaction.findOne({
          reference: m_payment_id,
          user: userId,
          gateway: 'payfast_hpp'
        });

        if (transaction && transaction.status === 'pending') {
          transaction.status = 'failed';
          await transaction.save();
          console.log("PayFast HPP: Transaction marked as failed", {
            transactionId: transaction._id
          });
        }
      }

      req.flash("error_msg", "Payment was cancelled or failed. Please try again.");
      res.redirect("/pricing");

    } catch (error) {
      console.error("PayFast HPP: Cancel handler error:", error.message);
      req.flash("error_msg", "Error processing payment cancellation");
      res.redirect("/pricing");
    }
  },
];

/**
 * Generate PayFast signature for payment verification
 * @param {Object} data - Payment data object
 * @returns {string} - Generated signature
 */
function generatePayFastSignature(data) {
  try {
    // Create signature string (excluding signature field)
    const signatureString = Object.keys(data)
      .filter(key => key !== 'signature' && data[key] !== '' && data[key] !== undefined)
      .sort()
      .map(key => `${key}=${encodeURIComponent(data[key]).replace(/%20/g, '+')}`)
      .join('&');

    // Generate SHA1 signature using passphrase if available
    const signatureData = process.env.PAYFAST_PASSPHRASE
      ? signatureString + '&passphrase=' + process.env.PAYFAST_PASSPHRASE
      : signatureString;

    return crypto.createHash('sha1')
      .update(signatureData)
      .digest('hex')
      .toLowerCase();

  } catch (error) {
    console.error("PayFast HPP: Signature generation error:", error.message);
    throw new Error("Failed to generate payment signature");
  }
}

/**
 * Verify PayFast IPN signature
 * @param {Object} ipnData - IPN data from PayFast
 * @returns {boolean} - True if signature is valid
 */
function verifyPayFastSignature(ipnData) {
  try {
    // Remove signature from data for verification
    const { signature, ...dataWithoutSignature } = ipnData;

    if (!signature) {
      console.error("PayFast HPP: No signature provided for verification");
      return false;
    }

    // Generate expected signature
    const expectedSignature = generatePayFastSignature(dataWithoutSignature);

    const isValid = signature.toLowerCase() === expectedSignature;
    if (!isValid) {
      console.error("PayFast HPP: Signature verification failed", {
        received: signature,
        expected: expectedSignature
      });
    }

    return isValid;
  } catch (error) {
    console.error("PayFast HPP: Signature verification error:", error.message);
    return false;
  }
}

/**
 * Send payment notification
 * @param {Object} req - Request object
 * @param {string} userId - User ID
 * @param {number} amount - Payment amount
 * @param {string} status - Payment status
 */
async function sendPaymentNotification(req, userId, amount, status) {
  try {
    // Send notification if notification service is available
    if (req.app.locals.notificationService) {
      const user = await User.findById(userId).select('first_name');
      if (user) {
        await req.app.locals.notificationService.createNotification(
          userId,
          user.first_name,
          `PayFast HPP ${status === 'success' ? 'Payment Success' : 'Payment Failed'}`
        );
      }
    }
  } catch (error) {
    console.error("PayFast HPP: Error sending notification:", error.message);
  }
}

/**
 * Sample request data for testing PayFast HPP payments
 * Use these examples to test the PayFast HPP integration
 */
exports.getSampleTestData = () => {
  return {
    // Sample payment initiation request
    initiatePayment: {
      amount: 20.88,
      item_name: "BASIC Plan Subscription",
      custom_ref: "test_payment_001"
    },

    // Sample IPN data (for testing IPN handling)
    sampleIPNData: {
      m_payment_id: "hpp_1699123456789_user123_abc123def",
      payment_status: "COMPLETE",
      amount_gross: "20.88",
      signature: "calculated_signature_here",
      custom_int1: "507f1f77bcf86cd799439011",
      custom_str1: "hpp_payment"
    },

    // Environment variables required
    requiredEnvVars: [
      "PAYFAST_MERCHANT_ID",
      "PAYFAST_MERCHANT_KEY",
      "PAYFAST_PASSPHRASE",
      "PAYFAST_MODE",
      "PAYFAST_RETURN_URL",
      "PAYFAST_CANCEL_URL",
      "PAYFAST_NOTIFY_URL",
      "APP_BASE_URL"
    ],

    // Expected response format
    expectedResponse: {
      success: true,
      redirectUrl: "https://ipg2.apps.net.pk?merchant_id=26995&...",
      m_payment_id: "hpp_1699123456789_user123_abc123def",
      amount: 20.88,
      item_name: "BASIC Plan Subscription"
    }
  };
};

module.exports = exports;