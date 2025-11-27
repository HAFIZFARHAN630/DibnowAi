require('dotenv').config();
const mongoose = require('mongoose');
const planModel = require('./src/models/plan.model');

const dbUri = process.env.MONGODB_URI || process.env.DB_URI;

if (!dbUri) {
  console.error('❌ No database URI found in environment variables');
  process.exit(1);
}

mongoose.connect(dbUri)
  .then(async () => {
    console.log('✅ Connected to database\n');
    
    const plans = await planModel.find({});
    
    console.log('=== ALL PLANS WITH LIMITS ===\n');
    plans.forEach(plan => {
      console.log(`Plan: ${plan.plan_name}`);
      console.log(`  Price: ${plan.plan_price}`);
      console.log(`  Repair Customer: ${plan.repairCustomer}`);
      console.log(`  In Stock: ${plan.inStock}`);
      console.log(`  Category: ${plan.category}`);
      console.log(`  Brand: ${plan.brand}`);
      console.log(`  Teams: ${plan.teams}`);
      console.log('---');
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Database connection error:', err.message);
    process.exit(1);
  });
