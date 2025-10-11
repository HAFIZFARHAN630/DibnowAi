// Run this script to manually activate the pending PayFast payment
// node fix-pending-payment.js

require('dotenv').config();
const mongoose = require('mongoose');

const User = require('./src/models/user');
const Payments = require('./src/models/payments');
const PlanRequest = require('./src/models/planRequest');
const Transaction = require('./src/models/transaction');

async function fixPendingPayment() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the pending payment (most recent)
    const pendingPayment = await Payments.findOne({ status: 'pending' }).sort({ createdAt: -1 });
    
    if (!pendingPayment) {
      console.log('❌ No pending payment found');
      process.exit(0);
    }

    console.log('📋 Found pending payment:', {
      user: pendingPayment.user,
      plan: pendingPayment.plan,
      amount: pendingPayment.amount,
      gateway: pendingPayment.gateway,
      transaction_id: pendingPayment.transaction_id
    });

    const startDate = pendingPayment.startDate || new Date();
    const expiryDate = pendingPayment.expiryDate || (() => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + 30);
      return date;
    })();

    // 1. Update Payment to active
    pendingPayment.status = 'active';
    await pendingPayment.save();
    console.log('✅ Payment status updated to active');

    // 2. Update/Create PlanRequest
    await PlanRequest.findOneAndUpdate(
      { user: pendingPayment.user },
      {
        user: pendingPayment.user,
        planName: pendingPayment.plan,
        status: 'Active',
        invoiceStatus: 'Paid',
        startDate,
        expiryDate,
        amount: pendingPayment.amount,
        description: `${pendingPayment.plan} plan activated via PayFast automatic payment`
      },
      { upsert: true, new: true }
    );
    console.log('✅ PlanRequest updated to Active/Paid');

    // 3. Update User
    await User.findByIdAndUpdate(pendingPayment.user, {
      plan_name: pendingPayment.plan,
      payment_method: 'PayFast',
      plan_status: 'Active',
      invoice_status: 'Paid',
      start_date: startDate,
      expiry_date: expiryDate
    });
    console.log('✅ User updated with Active plan');

    // 4. Update plan limits
    let planLimit;
    switch (pendingPayment.plan) {
      case "BASIC": planLimit = 300; break;
      case "STANDARD": planLimit = 500; break;
      case "PREMIUM": planLimit = 1000; break;
      default: planLimit = 30; break;
    }
    const user = await User.findById(pendingPayment.user).select("plan_limit");
    if (user) {
      const newPlanLimit = (user.plan_limit || 0) + planLimit;
      await User.findByIdAndUpdate(pendingPayment.user, { plan_limit: newPlanLimit });
      console.log(`✅ Plan limit updated to: ${newPlanLimit}`);
    }

    // 5. Update Transaction
    await Transaction.findOneAndUpdate(
      { reference: pendingPayment.transaction_id, user: pendingPayment.user },
      { status: 'success', description: `${pendingPayment.plan} plan purchase via PayFast` }
    );
    console.log('✅ Transaction updated to success');

    console.log('\n🎉 Payment activation complete!');
    console.log('User can now see Active/Paid status on dashboard');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixPendingPayment();
