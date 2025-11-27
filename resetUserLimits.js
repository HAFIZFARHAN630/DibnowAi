require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/user');
const Repair = require('./src/models/repair');
const Inventory = require('./src/models/inventery');
const planModel = require('./src/models/plan.model');

const dbUri = process.env.MONGODB_URI || process.env.DB_URI;

mongoose.connect(dbUri)
  .then(async () => {
    console.log('✅ Connected to database\n');
    
    const userId = '6927e89494870f4e0da81e12';
    
    // Check current data
    const user = await User.findById(userId).select('plan_name planLimits plan_limit');
    const repairCount = await Repair.countDocuments({ user_id: userId });
    const inventoryCount = await Inventory.countDocuments({ user_id: userId });
    
    console.log('=== CURRENT DATA ===');
    console.log(`User Plan: ${user?.plan_name}`);
    console.log(`User planLimits:`, user?.planLimits);
    console.log(`Current repair count: ${repairCount}`);
    console.log(`Current inventory count: ${inventoryCount}`);
    
    // Get Free Trial plan from database
    const freeTrialPlan = await planModel.findOne({ plan_name: /^free trial$/i });
    
    if (freeTrialPlan) {
      console.log('\n=== FREE TRIAL PLAN LIMITS ===');
      console.log(`Repair Customer: ${freeTrialPlan.repairCustomer}`);
      console.log(`In Stock: ${freeTrialPlan.inStock}`);
      console.log(`Category: ${freeTrialPlan.category}`);
      console.log(`Brand: ${freeTrialPlan.brand}`);
      console.log(`Teams: ${freeTrialPlan.teams}`);
      
      // Update user's planLimits to match Free Trial plan
      const updatedPlanLimits = {
        repairCustomer: parseInt(freeTrialPlan.repairCustomer) || 0,
        category: parseInt(freeTrialPlan.category) || 0,
        brand: parseInt(freeTrialPlan.brand) || 0,
        teams: parseInt(freeTrialPlan.teams) || 0,
        inStock: parseInt(freeTrialPlan.inStock) || 0
      };
      
      await User.findByIdAndUpdate(userId, {
        plan_name: 'Free Trial',
        planLimits: updatedPlanLimits
      });
      
      console.log('\n=== UPDATED USER LIMITS ===');
      console.log('Updated user planLimits to:', updatedPlanLimits);
      
      // Show what user can do now
      console.log('\n=== WHAT USER CAN ADD ===');
      console.log(`Repair customers: ${Math.max(0, updatedPlanLimits.repairCustomer - repairCount)} more (${repairCount}/${updatedPlanLimits.repairCustomer})`);
      console.log(`Inventory items: ${Math.max(0, updatedPlanLimits.inStock - inventoryCount)} more (${inventoryCount}/${updatedPlanLimits.inStock})`);
      console.log(`Categories: ${updatedPlanLimits.category} total`);
      console.log(`Brands: ${updatedPlanLimits.brand} total`);
      console.log(`Teams: ${updatedPlanLimits.teams} total`);
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Database connection error:', err.message);
    process.exit(1);
  });