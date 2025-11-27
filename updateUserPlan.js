require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/user');
const planModel = require('./src/models/plan.model');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to database');
    
    const userId = '6927eb4894dc1b3ecab96718';
    
    // Get user current data
    const user = await User.findById(userId);
    console.log('Current user plan:', user.plan_name);
    console.log('Current planLimits:', user.planLimits);
    
    // Get Basic plan from database
    const basicPlan = await planModel.findOne({ plan_name: /^basic$/i });
    console.log('Basic plan from DB:', basicPlan);
    
    if (basicPlan) {
      console.log('Basic plan limits from DB:', {
        repairCustomer: basicPlan.repairCustomer,
        category: basicPlan.category, 
        brand: basicPlan.brand,
        teams: basicPlan.teams,
        inStock: basicPlan.inStock
      });
      
      // Update user's planLimits to match current Basic plan
      const updatedPlanLimits = {
        repairCustomer: parseInt(basicPlan.repairCustomer) || 0,
        category: parseInt(basicPlan.category) || 0,
        brand: parseInt(basicPlan.brand) || 0,
        teams: parseInt(basicPlan.teams) || 0,
        inStock: parseInt(basicPlan.inStock) || 0
      };
      
      console.log('Updating user planLimits to:', updatedPlanLimits);
      
      await User.findByIdAndUpdate(userId, {
        plan_name: 'Basic',
        planLimits: updatedPlanLimits,
        subscription_date: new Date()
      });
      
      console.log('✅ Updated user planLimits to match current Basic plan');
      
      // Verify the update
      const updatedUser = await User.findById(userId).select('plan_name planLimits');
      console.log('✅ Verified user data:', updatedUser);
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });