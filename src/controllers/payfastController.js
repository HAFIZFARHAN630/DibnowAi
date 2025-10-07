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
 * Initiate PayFast payment - PRODUCTION READY
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

    // Use real phone number or default
    const customerPhone = user.phone_number || '+92300000000';
    
    const basketId = `CART-${Date.now()}`;
    // Convert GBP to PKR (1 GBP = ~397 PKR with 4% fee)
    const gbpAmount = parseFloat(amount);
    const pkrAmount = (gbpAmount * 397.1863).toFixed(2);
    const transAmount = pkrAmount;
    
    // Use Pakistan timezone for order date
    const orderDate = new Date().toLocaleString('en-PK', { 
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).split(',')[0].split('/').reverse().join('-');

    // Get access token
    const token = await getAccessToken(basketId, transAmount);

    // Compute signature
    const signature = computeSignature(
      process.env.PAYFAST_MERCHANT_ID,
      basketId,
      transAmount,
      'PKR',
      process.env.PAYFAST_SECURED_KEY
    );

    console.log('PayFast: Amount conversion', { gbp: gbpAmount, pkr: pkrAmount });

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

    console.log('PayFast: Generating payment form', { 
      basketId, 
      gbpAmount, 
      pkrAmount: transAmount,
      token: token.substring(0, 30) + '...',
      signature: signature.substring(0, 30) + '...',
      merchantId: process.env.PAYFAST_MERCHANT_ID
    });

    // Generate HTML form that auto-submits to PayFast
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>PayFast Payment</title>
  <style>
    body { font-family: Arial; text-align: center; padding: 50px; background: #f5f5f5; }
    .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .loader { border: 5px solid #f3f3f3; border-top: 5px solid #3498db; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 20px auto; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    h2 { color: #333; }
    p { color: #666; }
    .debug { background: #f0f0f0; padding: 10px; margin: 20px 0; font-size: 12px; text-align: left; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Redirecting to PayFast...</h2>
    <div class="loader"></div>
    <p>Please wait while we redirect you to complete your payment securely.</p>
    <div class="debug">
      <strong>Debug Info:</strong><br>
      Basket ID: ${basketId}<br>
      Amount: £${gbpAmount} GBP = ${transAmount} PKR<br>
      Token: ${token.substring(0, 20)}...<br>
      Signature: ${signature.substring(0, 20)}...<br>
      Form Action: https://ipg2.apps.net.pk/Ecommerce/Pay
    </div>
    <form method="post" action="https://ipg2.apps.net.pk/Ecommerce/Pay" id="payfastForm" target="_blank">
      <input type="hidden" name="MERCHANT_ID" value="${process.env.PAYFAST_MERCHANT_ID}">
      <input type="hidden" name="MERCHANT_NAME" value="Dibnow">
      <input type="hidden" name="TOKEN" value="${token}">
      <input type="hidden" name="PROCCODE" value="00">
      <input type="hidden" name="TXNAMT" value="${transAmount}">
      <input type="hidden" name="CURRENCY_CODE" value="PKR">
      <input type="hidden" name="CUSTOMER_MOBILE_NO" value="${customerPhone}">
      <input type="hidden" name="CUSTOMER_EMAIL_ADDRESS" value="${user.email}">
      <input type="hidden" name="SIGNATURE" value="${signature}">
      <input type="hidden" name="VERSION" value="1.0">
      <input type="hidden" name="TXNDESC" value="${plan} Plan Payment">
      <input type="hidden" name="SUCCESS_URL" value="${process.env.PAYFAST_RETURN_URL}">
      <input type="hidden" name="FAILURE_URL" value="${process.env.PAYFAST_CANCEL_URL}">
      <input type="hidden" name="BASKET_ID" value="${basketId}">
      <input type="hidden" name="ORDER_DATE" value="${orderDate}">
      <input type="hidden" name="CHECKOUT_URL" value="${process.env.PAYFAST_NOTIFY_URL}">
      <button type="submit" style="margin-top: 20px; padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">Click here if not redirected</button>
    </form>
    <script>
      console.log('✅ PayFast form page loaded');
      console.log('📋 Form element:', document.getElementById('payfastForm'));
      console.log('📋 Form action:', document.getElementById('payfastForm').action);
      console.log('📋 Form method:', document.getElementById('payfastForm').method);
      
      // Try immediate submission
      console.log('🚀 Attempting form submission...');
      try {
        document.getElementById('payfastForm').submit();
        console.log('✅ Form submitted successfully');
      } catch (e) {
        console.error('❌ Form submission error:', e);
        alert('Form submission failed. Please click the button to continue.');
      }
    </script>
  </div>
</body>
</html>`;

    res.send(html);

  } catch (error) {
    console.error('PayFast Error:', error.message);
    console.error('PayFast Error Details:', error.response?.data);
    
    // Log failed payment attempt
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
 * Handle PayFast webhook - WITH SIGNATURE VERIFICATION
 */
exports.handleWebhook = async (req, res) => {
  try {
    console.log('PayFast Webhook received:', req.body);

    const { BASKET_ID, TXNAMT, SIGNATURE, payment_status } = req.body;

    if (!SIGNATURE) {
      console.error('No signature in webhook');
      return res.status(400).send('No signature');
    }

    // Compute expected signature
    const computedSignature = computeSignature(
      process.env.PAYFAST_MERCHANT_ID,
      BASKET_ID,
      TXNAMT,
      'PKR',
      process.env.PAYFAST_SECURED_KEY
    );

    if (SIGNATURE !== computedSignature) {
      console.error('Invalid webhook signature');
      return res.status(400).send('Invalid signature');
    }

    // Update payment status
    if (payment_status === 'COMPLETE' || payment_status === 'SUCCESS') {
      const payment = await Payments.findOneAndUpdate(
        { transaction_id: BASKET_ID },
        { status: 'active' },
        { new: true }
      );

      if (payment) {
        await User.findByIdAndUpdate(payment.user, { plan_name: payment.plan });
        
        await Transaction.create({
          user: payment.user,
          type: 'payment',
          amount: parseFloat(TXNAMT),
          status: 'success',
          gateway: 'payfast',
          reference: BASKET_ID
        });

        console.log('Payment activated:', BASKET_ID);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook Error:', error.message);
    res.status(500).send('Error');
  }
};
