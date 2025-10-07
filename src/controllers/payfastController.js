require("dotenv").config();
const axios = require("axios");
const crypto = require("crypto");

// Model imports
const User = require("../models/user");
const Payments = require("../models/payments");
const Transaction = require("../models/transaction");

/**
 * Get OAuth2 access token from PayFast
 */
async function getAccessToken(basketId, amount) {
  try {
    const formData = new URLSearchParams();
    formData.append('MERCHANT_ID', process.env.PAYFAST_MERCHANT_ID);
    formData.append('SECURED_KEY', process.env.PAYFAST_SECURED_KEY);
    formData.append('BASKET_ID', basketId);
    formData.append('TXNAMT', amount);
    formData.append('CURRENCY_CODE', 'GBP');

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
 * Compute PayFast signature
 */
function computeSignature(merchantId, basketId, amount, currency, securedKey) {
  const signatureString = `${merchantId}${basketId}${amount}${currency}${securedKey}`;
  return crypto.createHash('sha256').update(signatureString).digest('hex');
}

/**
 * Initiate PayFast payment - LIVE VERSION
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

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const basketId = `CART-${Date.now()}`;
    const transAmount = parseFloat(amount).toFixed(2);
    const orderDate = new Date().toISOString().slice(0, 10);

    // Get access token
    const token = await getAccessToken(basketId, transAmount);

    // Compute signature
    const signature = computeSignature(
      process.env.PAYFAST_MERCHANT_ID,
      basketId,
      transAmount,
      'GBP',
      process.env.PAYFAST_SECURED_KEY
    );

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

    // Make server-side POST to PayFast to get redirect URL
    const paymentData = {
      MERCHANT_ID: process.env.PAYFAST_MERCHANT_ID,
      MERCHANT_NAME: 'Dibnow',
      TOKEN: token,
      PROCCODE: '00',
      TXNAMT: transAmount,
      CURRENCY_CODE: 'GBP',
      CUSTOMER_MOBILE_NO: '+92300000000',
      CUSTOMER_EMAIL_ADDRESS: user.email,
      SIGNATURE: signature,
      VERSION: '1.0',
      TXNDESC: `${plan} Plan Payment`,
      SUCCESS_URL: process.env.PAYFAST_RETURN_URL,
      FAILURE_URL: process.env.PAYFAST_CANCEL_URL,
      BASKET_ID: basketId,
      ORDER_DATE: orderDate,
      CHECKOUT_URL: process.env.PAYFAST_NOTIFY_URL
    };

    console.log('Posting to PayFast:', paymentData);

    const payfastResponse = await axios.post(
      'https://ipg2.apps.net.pk/Ecommerce/api/Transaction/PostTransaction',
      paymentData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        maxRedirects: 0,
        validateStatus: (status) => status < 400
      }
    );

    console.log('PayFast Response:', payfastResponse.data);

    // Check if PayFast returned a redirect URL
    if (payfastResponse.data && payfastResponse.data.REDIRECT_URL) {
      // Redirect user to PayFast portal
      return res.redirect(payfastResponse.data.REDIRECT_URL);
    }

    // Fallback: Generate HTML form if no redirect URL
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>PayFast Payment</title>
  <style>
    body { font-family: Arial; text-align: center; padding: 50px; }
    .loader { border: 5px solid #f3f3f3; border-top: 5px solid #3498db; 
              border-radius: 50%; width: 50px; height: 50px; 
              animation: spin 1s linear infinite; margin: 20px auto; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <h2>Redirecting to PayFast Payment Portal...</h2>
  <div class="loader"></div>
  <p>Please wait while we redirect you to complete your payment.</p>
  <form method="post" action="https://ipg2.apps.net.pk/Ecommerce/api/Transaction/PostTransaction" id="payfastForm">
    <input type="hidden" name="MERCHANT_ID" value="${process.env.PAYFAST_MERCHANT_ID}">
    <input type="hidden" name="MERCHANT_NAME" value="Dibnow">
    <input type="hidden" name="TOKEN" value="${token}">
    <input type="hidden" name="PROCCODE" value="00">
    <input type="hidden" name="TXNAMT" value="${transAmount}">
    <input type="hidden" name="CURRENCY_CODE" value="GBP">
    <input type="hidden" name="CUSTOMER_MOBILE_NO" value="+92300000000">
    <input type="hidden" name="CUSTOMER_EMAIL_ADDRESS" value="${user.email}">
    <input type="hidden" name="SIGNATURE" value="${signature}">
    <input type="hidden" name="VERSION" value="1.0">
    <input type="hidden" name="TXNDESC" value="${plan} Plan Payment">
    <input type="hidden" name="SUCCESS_URL" value="${process.env.PAYFAST_RETURN_URL}">
    <input type="hidden" name="FAILURE_URL" value="${process.env.PAYFAST_CANCEL_URL}">
    <input type="hidden" name="BASKET_ID" value="${basketId}">
    <input type="hidden" name="ORDER_DATE" value="${orderDate}">
    <input type="hidden" name="CHECKOUT_URL" value="${process.env.PAYFAST_NOTIFY_URL}">
  </form>
  <script>
    console.log('PayFast form loaded, submitting now...');
    setTimeout(function() {
      console.log('Submitting PayFast form...');
      document.getElementById('payfastForm').submit();
    }, 500);
  </script>
</body>
</html>`;

    res.send(html);

  } catch (error) {
    console.error('PayFast Error:', error.message);
    console.error('PayFast Error Details:', error.response?.data);
    res.status(500).json({
      success: false,
      message: "Payment failed: " + error.message
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
      message: "PayFast connection successful",
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
 * Handle PayFast webhook notifications - WITH SIGNATURE VERIFICATION
 */
exports.handleWebhook = async (req, res) => {
  try {
    console.log('PayFast Webhook received:', req.body);

    const { BASKET_ID, TXNAMT, SIGNATURE, payment_status } = req.body;

    // Verify signature
    const computedSignature = computeSignature(
      process.env.PAYFAST_MERCHANT_ID,
      BASKET_ID,
      TXNAMT,
      'GBP',
      process.env.PAYFAST_SECURED_KEY
    );

    if (SIGNATURE !== computedSignature) {
      console.error('Invalid webhook signature');
      return res.status(400).send('Invalid signature');
    }

    // Update payment status
    if (payment_status === 'COMPLETE' || payment_status === 'completed') {
      await Payments.findOneAndUpdate(
        { transaction_id: BASKET_ID },
        { status: 'active' }
      );
      console.log('Payment activated:', BASKET_ID);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook Error:', error.message);
    res.status(500).send('Error');
  }
};
