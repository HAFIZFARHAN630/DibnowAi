// One-time script to refresh plan limits for existing users
// Run this once: node REFRESH_PLAN_LIMITS.js

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/user');
const planModel = require('./src/models/plan.model');

async function refreshPlanLimits() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all users with active plans
    const users = await User.find({ plan_name: { $exists: true, $ne: null } });
    console.log(`📋 Found ${users.length} users with plans`);

    for (const user of users) {
      if (!user.plan_name || user.plan_name === 'No Plan') continue;

      console.log(`\n🔄 Processing user: ${user.email}, Plan: ${user.plan_name}`);

      // Find plan in database (case-insensitive)
      let plan = await planModel.findOne({ 
        plan_name: { $regex: new RegExp(`^${user.plan_name}$`, 'i') } 
      });

      if (!plan) {
        console.log(`❌ Plan "${user.plan_name}" not found in database`);
        continue;
      }

      // Update user's planLimits from plan database
      const newLimits = {
        repairCustomer: parseInt(plan.repairCustomer) || 0,
        category: parseInt(plan.category) || 0,
        brand: parseInt(plan.brand) || 0,
        teams: parseInt(plan.teams) || 0,
        inStock: parseInt(plan.inStock) || 0
      };

      await User.findByIdAndUpdate(user._id, {
        $set: { planLimits: newLimits }
      });

      console.log(`✅ Updated limits for ${user.email}:`, newLimits);
    }

    console.log('\n✅ All users updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

refreshPlanLimits();
