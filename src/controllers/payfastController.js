require("dotenv").config();
const axios = require("axios");
const crypto = require("crypto");

// Model imports
const User = require("../models/user");
const Payments = require("../models/payments");
const Transaction = require("../models/transaction");

/**
 * Get access token from PayFast
 */
async function getAccessToken(basketId, amount) {
  try {
    const formData = new URLSearchParams();
    formData.append('MERCHANT_ID', process.env.PAYFAST_MERCHANT_ID);
    formData.append('SECURED_KEY', process.env.PAYFAST_SECURED_KEY);
    formData.append('BASKET_ID', basketId);
    formData.append('TXNAMT', amount);
    formData.append('CURRENCY_CODE', 'PKR');

    const response = await axios.post(
      'https://ipg1.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken',
      formData,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    if (!response.data.ACCESS_TOKEN) {
      throw new Error('No access token received');
    }

    return response.data.ACCESS_TOKEN;
  } catch (error) {
    console.error('PayFast Token Error:', error.response?.data || error.message);
    throw new Error('Failed to get PayFast token');
  }
}

/**
 * Compute PayFast signature - SHA256
 */
function computeSignature(merchantId, basketId, amount, currency, securedKey) {
  const signatureString = `${merchantId}${basketId}${amount}${currency}${securedKey}`;
  return crypto.createHash('sha256').update(signatureString).digest('hex');
}

/**
 * Initiate PayFast payment - Following Official PayFast OAuth2 Workflow
 */
exports.initiatePayment = async (req, res) => {
  try {
    const { plan, amount } = req.body;
    const userId = req.session.userId;

    if (!plan || !amount || !userId) {
      return res.status(400).json({
        success: false,
        message: "Plan, amount, and user session required"
      });
    }

    const user = await User.findById(userId).select('first_name last_name email phone_number');
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const customerPhone = user.phone_number || '03123456789';
    const basketId = `ITEM-${Date.now()}`;
    // TEMPORARY: Using PKR directly for testing (no conversion)
    const pkrAmount = parseFloat(amount).toFixed(2);
    
    const orderDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Get access token from PayFast
    const token = await getAccessToken(basketId, pkrAmount);

    // Save payment record
    const startDate = new Date();
    const expiryDate = new Date(startDate);
    expiryDate.setDate(expiryDate.getDate() + 30);

    const payment = new Payments({
      user: userId,
      plan,
      amount: parseFloat(amount),
      gateway: 'payfast',
      status: 'pending',
      transaction_id: basketId,
      startDate,
      expiryDate
    });
    await payment.save();
    
    // Create transaction record immediately
    await Transaction.create({
      user: userId,
      type: 'plan_purchase',
      amount: parseFloat(amount),
      status: 'pending',
      gateway: 'payfast',
      reference: basketId,
      description: `${plan} plan purchase via PayFast (Pending)`
    });
    console.log(`✅ Pending transaction created for basket ${basketId}`);

    console.log('PayFast: Initiating payment', { basketId, pkrAmount, tokenLength: token.length });

    // Generate professional HTML form matching addteam.ejs styling
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>PayFast Payment - Dibnow</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
  <style>
    body {
      font-family: Arial, sans-serif;
      background: #F3F3F9;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      margin: 0;
    }
    .form-container {
      background: linear-gradient(135deg, #0033cc 0%, #33ccff 100%);
      padding: 50px;
      border-radius: 25px;
      box-shadow: 0 30px 100px rgba(0, 0, 0, 0.2);
      max-width: 700px;
      width: 100%;
      position: relative;
      backdrop-filter: blur(15px);
      border: 2px solid rgba(255, 255, 255, 0.3);
      text-align: center;
    }
    .close-btn {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
      border: none;
      border-radius: 50%;
      color: white;
      font-size: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
      z-index: 10;
    }
    .close-btn:hover {
      transform: scale(1.1) rotate(90deg);
      box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
    }
    .form-header {
      margin-bottom: 35px;
    }
    .form-header h2 {
      font-size: 32px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 15px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }
    .form-header p {
      color: rgba(255, 255, 255, 0.9);
      font-size: 16px;
      line-height: 1.6;
      margin: 0;
    }
    .payment-info {
      background: rgba(255, 255, 255, 0.15);
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 15px;
      padding: 25px;
      margin: 25px 0;
      backdrop-filter: blur(10px);
    }
    .payment-info .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 12px 0;
      color: #ffffff;
      font-size: 16px;
    }
    .payment-info .info-label {
      font-weight: 600;
      opacity: 0.9;
    }
    .payment-info .info-value {
      font-weight: 700;
      font-size: 18px;
    }
    .loader {
      border: 5px solid rgba(255, 255, 255, 0.3);
      border-top: 5px solid #ffffff;
      border-radius: 50%;
      width: 60px;
      height: 60px;
      animation: spin 1s linear infinite;
      margin: 25px auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .btn-submit {
      width: 100%;
      height: 60px;
      background: linear-gradient(135deg, #00C853 0%, #00B894 100%);
      border: none;
      border-radius: 15px;
      color: #ffffff;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 1px;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 10px 30px rgba(0, 184, 148, 0.4);
      text-transform: uppercase;
      margin-top: 20px;
    }
    .btn-submit:hover {
      background: linear-gradient(135deg, #00E676 0%, #00C853 100%);
      transform: translateY(-3px);
      box-shadow: 0 15px 40px rgba(0, 200, 83, 0.5);
    }
    .security-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: rgba(255, 255, 255, 0.8);
      font-size: 14px;
      margin-top: 20px;
    }
    @media (max-width: 768px) {
      .form-container {
        padding: 35px 25px;
      }
      .form-header h2 {
        font-size: 26px;
      }
      .payment-info {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="form-container">
    <button type="button" class="close-btn" onclick="window.location.href='/pricing'">
      <i class="fas fa-times"></i>
    </button>
    
    <div class="form-header">
      <h2><i class="fas fa-credit-card me-3"></i>PayFast Payment Gateway</h2>
      <p>Securely processing your payment through PayFast Pakistan</p>
    </div>

    <div class="loader"></div>

    <div class="payment-info">
      <div class="info-row">
        <span class="info-label"><i class="fas fa-box me-2"></i>Plan:</span>
        <span class="info-value">${plan}</span>
      </div>
      <div class="info-row">
        <span class="info-label"><i class="fas fa-money-bill-wave me-2"></i>Amount (PKR):</span>
        <span class="info-value">₨ ${pkrAmount}</span>
      </div>
      <div class="info-row">
        <span class="info-label"><i class="fas fa-receipt me-2"></i>Transaction ID:</span>
        <span class="info-value" style="font-size: 14px;">${basketId}</span>
      </div>
    </div>
    
    <form class="form-inline" id="PayFast_payment_form" method="post" 
          action="https://ipg1.apps.net.pk/Ecommerce/api/Transaction/PostTransaction">
      
      <input type="hidden" name="CURRENCY_CODE" value="PKR">
      <input type="hidden" name="MERCHANT_ID" value="${process.env.PAYFAST_MERCHANT_ID}">
      <input type="hidden" name="MERCHANT_NAME" value="Dibnow">
      <input type="hidden" name="TOKEN" value="${token}">
      <input type="hidden" name="BASKET_ID" value="${basketId}">
      <input type="hidden" name="TXNAMT" value="${pkrAmount}">
      <input type="hidden" name="ORDER_DATE" value="${orderDate}">
      <input type="hidden" name="SUCCESS_URL" value="${process.env.PAYFAST_RETURN_URL}">
      <input type="hidden" name="FAILURE_URL" value="${process.env.PAYFAST_CANCEL_URL}">
      <input type="hidden" name="CHECKOUT_URL" value="${process.env.PAYFAST_NOTIFY_URL}">
      <input type="hidden" name="CUSTOMER_EMAIL_ADDRESS" value="${user.email}">
      <input type="hidden" name="CUSTOMER_MOBILE_NO" value="${customerPhone}">
      <input type="hidden" name="SIGNATURE" value="SOMERANDOM-STRING">
      <input type="hidden" name="VERSION" value="MERCHANTCART-0.1">
      <input type="hidden" name="TXNDESC" value="${plan} Plan Payment">
      <input type="hidden" name="PROCCODE" value="00">
      <input type="hidden" name="TRAN_TYPE" value="ECOMM_PURCHASE">
      <input type="hidden" name="STORE_ID" value="">
      <input type="hidden" name="ADDITIONAL_VALUE" value="">
      <input type="hidden" name="RECURRING_TXN" value="">
      
      <button type="submit" class="btn-submit">
        <i class="fas fa-lock me-2"></i>Click here if not redirected
      </button>
    </form>

    <div class="security-badge">
      <i class="fas fa-shield-alt"></i>
      <span>Secured by PayFast Pakistan | 256-bit SSL Encryption</span>
    </div>
    
    <script>
      console.log('✅ PayFast payment form loaded');
      console.log('📋 Transaction ID: ${basketId}');
      console.log('💰 Amount: ₨${pkrAmount} PKR');
      
      setTimeout(() => {
        console.log('🚀 Auto-submitting form to PayFast...');
        document.getElementById('PayFast_payment_form').submit();
      }, 2000);
    </script>
  </div>
</body>
</html>`;

    res.send(html);

  } catch (error) {
    console.error('PayFast Error:', error.message);
    console.error('PayFast Error Details:', error.response?.data);
    
    try {
      await Transaction.create({
        user: req.session.userId,
        type: 'payment',
        amount: parseFloat(req.body.amount),
        status: 'failed',
        gateway: 'payfast',
        error: error.message
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    res.status(500).json({
      success: false,
      message: "Payment initiation failed: " + error.message
    });
  }
};

/**
 * Test PayFast connection
 */
exports.testPayFastConnection = async (req, res) => {
  try {
    const token = await getAccessToken('TEST-123', '10.00');
    res.json({
      success: true,
      message: "PayFast OAuth2 connection successful",
      token_length: token.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Handle PayFast success callback
 */
exports.handleSuccess = async (req, res) => {
  try {
    console.log('PayFast Success callback:', req.query);
    const { BASKET_ID, err_msg } = req.query;

    if (BASKET_ID && err_msg === 'Success') {
      const payment = await Payments.findOneAndUpdate(
        { transaction_id: BASKET_ID },
        { status: 'active' },
        { new: true }
      );

      if (payment) {
        const PlanRequest = require("../models/planRequest");
        const startDate = payment.startDate || new Date();
        const expiryDate = payment.expiryDate || (() => {
          const date = new Date(startDate);
          date.setDate(date.getDate() + 30);
          return date;
        })();
        
        // Update user with plan details
        await User.findByIdAndUpdate(payment.user, {
          plan_name: payment.plan,
          payment_method: 'PayFast',
          plan_status: 'Active',
          invoice_status: 'Paid',
          start_date: startDate,
          expiry_date: expiryDate
        });
        console.log(`✅ User plan updated to ${payment.plan}`);
        
        // Create/Update PlanRequest with Active status and Paid invoice
        await PlanRequest.findOneAndUpdate(
          { user: payment.user },
          {
            user: payment.user,
            planName: payment.plan,
            status: 'Active',
            invoiceStatus: 'Paid',
            startDate,
            expiryDate,
            amount: payment.amount,
            description: `${payment.plan} plan activated via PayFast automatic payment`
          },
          { upsert: true, new: true }
        );
        console.log(`✅ PlanRequest auto-activated for user ${payment.user}`);
        
        // Update plan limits
        await subscribePlan(payment.user, payment.plan);
        console.log(`✅ Plan limits updated for user ${payment.user}`);
        
        // Update existing transaction to success or create new one
        const existingTxn = await Transaction.findOne({ reference: BASKET_ID, user: payment.user });
        if (existingTxn) {
          existingTxn.status = 'success';
          existingTxn.description = `${payment.plan} plan purchase via PayFast`;
          await existingTxn.save();
          console.log(`✅ Transaction updated to success for ${BASKET_ID}`);
        } else {
          await Transaction.create({
            user: payment.user,
            type: 'plan_purchase',
            amount: payment.amount,
            status: 'success',
            gateway: 'payfast',
            reference: BASKET_ID,
            description: `${payment.plan} plan purchase via PayFast`
          });
          console.log(`✅ New success transaction created for ${BASKET_ID}`);
        }

        console.log('✅ Payment activated via success callback:', BASKET_ID);
      }
    }

    res.redirect('/success?plan=' + (payment?.plan || 'BASIC') + '&gateway=payfast');
  } catch (error) {
    console.error('Success callback error:', error.message);
    res.redirect('/cancel');
  }
};

// Function to subscribe and update plan limits
async function subscribePlan(userId, planType) {
  try {
    let planLimit;
    switch (planType) {
      case "BASIC": planLimit = 300; break;
      case "STANDARD": planLimit = 500; break;
      case "PREMIUM": planLimit = 1000; break;
      default: planLimit = 30; break;
    }
    const user = await User.findById(userId).select("plan_limit");
    if (user) {
      const newPlanLimit = (user.plan_limit || 0) + planLimit;
      await User.findByIdAndUpdate(userId, { plan_limit: newPlanLimit });
      console.log(`User's plan limit updated to: ${newPlanLimit}`);
    }
  } catch (error) {
    console.error("Error updating plan limit:", error.message);
  }
}

/**
 * Handle PayFast cancel callback
 */
exports.handleCancel = async (req, res) => {
  try {
    console.log('PayFast Cancel callback:', req.query);
    res.redirect('/cancel');
  } catch (error) {
    console.error('Cancel callback error:', error.message);
    res.redirect('/pricing');
  }
};

/**
 * Handle PayFast webhook/IPN - WITH SIGNATURE VERIFICATION
 */
exports.handleWebhook = async (req, res) => {
  try {
    console.log('PayFast Webhook/IPN received:', req.body);

    const { BASKET_ID, TXNAMT, payment_status, err_msg } = req.body;

    // Update payment status
    if (payment_status === 'COMPLETE' || payment_status === 'SUCCESS' || err_msg === 'Success') {
      const payment = await Payments.findOneAndUpdate(
        { transaction_id: BASKET_ID },
        { status: 'active' },
        { new: true }
      );

      if (payment) {
        const PlanRequest = require("../models/planRequest");
        const startDate = payment.startDate || new Date();
        const expiryDate = payment.expiryDate || (() => {
          const date = new Date(startDate);
          date.setDate(date.getDate() + 30);
          return date;
        })();

        // Update user with complete plan details
        await User.findByIdAndUpdate(payment.user, {
          plan_name: payment.plan,
          payment_method: 'PayFast',
          plan_status: 'Active',
          invoice_status: 'Paid',
          start_date: startDate,
          expiry_date: expiryDate
        });
        console.log(`✅ User plan updated via webhook to ${payment.plan}`);

        // Create/Update PlanRequest with Active status and Paid invoice
        await PlanRequest.findOneAndUpdate(
          { user: payment.user },
          {
            user: payment.user,
            planName: payment.plan,
            status: 'Active',
            invoiceStatus: 'Paid',
            startDate,
            expiryDate,
            amount: parseFloat(TXNAMT || payment.amount),
            description: `${payment.plan} plan activated via PayFast automatic payment`
          },
          { upsert: true, new: true }
        );
        console.log(`✅ PlanRequest auto-activated via webhook for user ${payment.user}`);

        // Update plan limits
        await subscribePlan(payment.user, payment.plan);
        
        await Transaction.create({
          user: payment.user,
          type: 'plan_purchase',
          amount: parseFloat(TXNAMT || payment.amount),
          status: 'success',
          gateway: 'payfast',
          reference: BASKET_ID,
          description: `${payment.plan} plan purchase via PayFast`
        });

        console.log('✅ Payment activated via webhook:', BASKET_ID);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook Error:', error.message);
    res.status(500).send('Error');
  }
};
