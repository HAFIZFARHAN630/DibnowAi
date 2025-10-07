require("dotenv").config();
const axios = require("axios");

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
 * Initiate PayFast payment
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

    // Generate PayFast form HTML
    const html = `<!DOCTYPE html>
<html>
<head><title>PayFast Payment</title></head>
<body>
<form method="post" action="https://ipg2.apps.net.pk/Ecommerce/api/Transaction/PostTransaction" id="payfastForm">
  <input type="hidden" name="MERCHANT_ID" value="${process.env.PAYFAST_MERCHANT_ID}">
  <input type="hidden" name="MERCHANT_NAME" value="Dibnow">
  <input type="hidden" name="TOKEN" value="${token}">
  <input type="hidden" name="PROCCODE" value="00">
  <input type="hidden" name="TXNAMT" value="${transAmount}">
  <input type="hidden" name="CUSTOMER_MOBILE_NO" value="+92300000000">
  <input type="hidden" name="CUSTOMER_EMAIL_ADDRESS" value="${user.email}">
  <input type="hidden" name="SIGNATURE" value="SIGNATURE">
  <input type="hidden" name="VERSION" value="1.0">
  <input type="hidden" name="TXNDESC" value="${plan} Plan Payment">
  <input type="hidden" name="SUCCESS_URL" value="${process.env.PAYFAST_RETURN_URL}">
  <input type="hidden" name="FAILURE_URL" value="${process.env.PAYFAST_CANCEL_URL}">
  <input type="hidden" name="BASKET_ID" value="${basketId}">
  <input type="hidden" name="ORDER_DATE" value="${orderDate}">
  <input type="hidden" name="CHECKOUT_URL" value="${process.env.APP_BASE_URL}/pricing/payfast/webhook">
  <p>Redirecting to PayFast...</p>
</form>
<script>document.getElementById('payfastForm').submit();</script>
</body>
</html>`;

    res.send(html);

  } catch (error) {
    console.error('PayFast Error:', error.message);
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
 * Handle PayFast webhook notifications
 */
exports.handleWebhook = async (req, res) => {
  try {
    const { payment_id, status, amount } = req.body;

    if (status === 'completed') {
      await Payments.findOneAndUpdate(
        { transaction_id: payment_id },
        { status: 'active' }
      );
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook Error:', error.message);
    res.status(500).send('Error');
  }
};