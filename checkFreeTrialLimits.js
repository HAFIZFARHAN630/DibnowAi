require('dotenv').config();
const mongoose = require('mongoose');
const planModel = require('./src/models/plan.model');
const User = require('./src/models/user');

const dbUri = process.env.MONGODB_URI || process.env.DB_URI;

mongoose.connect(dbUri)
  .then(async () => {
    console.log('✅ Connected to database\n');
    
    // Check Free Trial plan in database
    const freeTrialPlan = await planModel.findOne({ plan_name: /^free trial$/i });
    
    if (freeTrialPlan) {
      console.log('=== FREE TRIAL PLAN IN DATABASE ===');
      console.log(`Plan Name: ${freeTrialPlan.plan_name}`);
      console.log(`Price: ${freeTrialPlan.plan_price}`);
      console.log(`Repair Customer: ${freeTrialPlan.repairCustomer}`);
      console.log(`In Stock: ${freeTrialPlan.inStock}`);
      console.log(`Category: ${freeTrialPlan.category}`);
      console.log(`Brand: ${freeTrialPlan.brand}`);
      console.log(`Teams: ${freeTrialPlan.teams}`);
    } else {
      console.log('❌ No Free Trial plan found in database');
    }
    
    // Check user's planLimits
    const user = await User.findById('6927e89494870f4e0da81e12').select('plan_name planLimits');
    
    if (user) {
      console.log('\n=== USER PLAN LIMITS ===');
      console.log(`User Plan Name: ${user.plan_name}`);
      console.log(`User Plan Limits:`, user.planLimits);
    } else {
      console.log('❌ User not found');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Database connection error:', err.message);
    process.exit(1);
  });