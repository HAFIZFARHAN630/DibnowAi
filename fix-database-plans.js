// Script to fix corrupted plan prices in database
const mongoose = require('mongoose');
require('dotenv').config();

// Use the existing plan model
const Plan = require('./src/models/plan.model');

async function fixDatabasePlans() {
  try {
    console.log('🔧 Fixing corrupted plan prices in database...');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dibnow');
    console.log('✅ Connected to database');

    // Find all plans
    const plans = await Plan.find({});
    console.log(`📋 Found ${plans.length} plans in database`);

    let fixedCount = 0;

    for (const plan of plans) {
      const currentPrice = parseFloat(plan.plan_price);
      let correctPrice = currentPrice;

      // Check if price is corrupted (way too high)
      if (currentPrice > 1000) {
        // This is likely a converted PKR amount, convert back to GBP
        correctPrice = currentPrice / 397.1863;

        console.log(`🔄 Fixing ${plan.plan_name}:`);
        console.log(`   Before: ${currentPrice} (corrupted)`);
        console.log(`   After: ${correctPrice.toFixed(2)} (GBP)`);

        // Update the plan
        await Plan.findByIdAndUpdate(plan._id, { plan_price: correctPrice });
        fixedCount++;
      } else {
        console.log(`✅ ${plan.plan_name}: ${currentPrice} (already correct)`);
      }
    }

    console.log(`🎉 Fixed ${fixedCount} corrupted plan(s)`);

    // Show final state
    const finalPlans = await Plan.find({}, 'plan_name plan_price');
    console.log('\n📋 Final plan prices:');
    finalPlans.forEach(plan => {
      console.log(`   ${plan.plan_name}: £${plan.plan_price}`);
    });

  } catch (error) {
    console.error('❌ Error fixing database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the fix
fixDatabasePlans();